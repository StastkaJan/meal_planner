<script lang="ts">
  import { onMount } from 'svelte';
  import type { Meal } from '$lib/schema';

  let meals: Meal[] = $state([]);
  let creating = $state(false);
  let newMeal: Partial<Meal> = $state({ name: '' });

  const diffLabel: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  onMount(async () => {
    meals = await fetch('/meals').then(r => r.json());
  });

  async function createMeal() {
    if (!newMeal.name?.trim()) return;
    const res = await fetch('/meals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(newMeal),
    });
    const created: Meal = await res.json();
    meals = [...meals, created];
    newMeal = { name: '' };
    creating = false;
  }

  async function deleteMeal(id: number) {
    if (!confirm('Delete this meal?')) return;
    await fetch(`/meals/${id}`, { method: 'DELETE' });
    meals = meals.filter(m => m.id !== id);
  }
</script>

<div class="page">
  <div class="top-bar">
    <h2>Meals</h2>
    <button class="btn" onclick={() => { creating = true; }}>+ Add meal</button>
  </div>

  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Difficulty</th>
        <th>Time</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if creating}
        <tr class="edit-row">
          <td><input type="text" bind:value={newMeal.name} placeholder="Meal name" autofocus /></td>
          <td>—</td>
          <td>—</td>
          <td class="actions">
            <button class="btn sm" onclick={createMeal}>Save</button>
            <button class="btn sm ghost" onclick={() => { creating = false; newMeal = { name: '' }; }}>Cancel</button>
          </td>
        </tr>
      {/if}

      {#each meals as meal (meal.id)}
        <tr>
          <td class="meal-name"><a href="/meals/{meal.id}">{meal.name}</a></td>
          <td>{meal.difficulty ? (diffLabel[meal.difficulty] ?? meal.difficulty) : '—'}</td>
          <td>{meal.timeMinutes ? `${meal.timeMinutes} min` : '—'}</td>
          <td class="actions">
            <button class="btn sm danger" onclick={() => deleteMeal(meal.id)}>Delete</button>
          </td>
        </tr>
      {:else}
        <tr>
          <td colspan="4" class="empty">No meals yet.</td>
        </tr>
      {/each}
    </tbody>
  </table>
  </div>
</div>

<style lang="scss">
  .page { display: flex; flex-direction: column; gap: 16px; }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 { font-size: 1.2rem; font-weight: 600; }

  .table-wrap {
    border: 1px solid $color-border;
    border-radius: $radius;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  thead { background: $color-surface; }
  th {
    text-align: left;
    padding: 10px 12px;
    color: $color-text-muted;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 2px solid $color-border;
  }
  td {
    padding: 10px 12px;
    border-top: 1px solid $color-border;
    color: $color-text;
  }
  tr:first-child td { border-top: none; }
  tbody tr:hover td { background: $color-surface-2; }

  .meal-name {
    font-weight: 500;
    a { color: $color-text; text-decoration: none; &:hover { color: $color-accent; } }
  }

  .edit-row td {
    padding: 4px 6px;
    background: $color-surface;

    input {
      width: 100%;
      background: $color-surface-2;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 5px 8px;
      color: $color-text;
      &:focus { outline: 2px solid $color-accent; border-color: transparent; }
    }
  }

  .actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }

  .btn {
    padding: 5px 14px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: opacity 0.15s;
    &:hover { opacity: 0.85; }
    &.sm { padding: 3px 10px; font-size: 0.8rem; }
    &.ghost { background: $color-surface; color: $color-text-muted; border: 1px solid $color-border; }
    &.danger { background: $color-danger; }
  }

  .empty {
    text-align: center;
    color: $color-text-muted;
    padding: 32px;
  }
</style>
