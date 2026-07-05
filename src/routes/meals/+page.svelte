<script lang="ts">
  import { enhance } from "$app/forms";
  import type { Meal } from "$lib/schema";

  type MealForm = {
    name: string;
    calories: string;
    proteinG: string;
    carbsG: string;
    fatG: string;
  };

  let { data } = $props();

  const meals = $derived(data.meals);
  let editingId: number | null = $state(null);
  let editing: MealForm = $state({
    name: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });
  let creating = $state(false);
  let newMeal: MealForm = $state({
    name: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });

  function toInputValue(value: string | number | null | undefined): string {
    return value === null || value === undefined ? "" : String(value);
  }

  function startEdit(meal: Meal) {
    editingId = meal.id;
    editing = {
      name: meal.name,
      calories: toInputValue(meal.calories),
      proteinG: toInputValue(meal.proteinG),
      carbsG: toInputValue(meal.carbsG),
      fatG: toInputValue(meal.fatG),
    };
  }

  async function refreshAfterMutation(
    update: () => Promise<void>,
    onSuccess: () => void,
  ) {
    await update();
    onSuccess();
  }
</script>

<div class="page">
  <div class="top-bar">
    <h2>Meals</h2>
    <button
      class="btn"
      onclick={() => {
        creating = true;
      }}>+ Add meal</button
    >
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Calories</th>
          <th>Protein (g)</th>
          <th>Carbs (g)</th>
          <th>Fat (g)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#if creating}
          <tr class="edit-row">
            <td colspan="6">
              <form
                method="POST"
                action="?/createMeal"
                class="meal-form"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === "success") {
                      await refreshAfterMutation(update, () => {
                        creating = false;
                        newMeal = {
                          name: "",
                          calories: "",
                          proteinG: "",
                          carbsG: "",
                          fatG: "",
                        };
                      });
                      return;
                    }
                    await update();
                  };
                }}
              >
                <input
                  type="text"
                  name="name"
                  bind:value={newMeal.name}
                  placeholder="Meal name"
                  required
                />
                <input
                  type="number"
                  name="calories"
                  bind:value={newMeal.calories}
                  placeholder="—"
                />
                <input
                  type="number"
                  name="proteinG"
                  bind:value={newMeal.proteinG}
                  placeholder="—"
                  step="0.1"
                />
                <input
                  type="number"
                  name="carbsG"
                  bind:value={newMeal.carbsG}
                  placeholder="—"
                  step="0.1"
                />
                <input
                  type="number"
                  name="fatG"
                  bind:value={newMeal.fatG}
                  placeholder="—"
                  step="0.1"
                />
                <div class="actions">
                  <button class="btn sm" type="submit">Save</button>
                  <button
                    class="btn sm ghost"
                    type="button"
                    onclick={() => {
                      creating = false;
                      newMeal = {
                        name: "",
                        calories: "",
                        proteinG: "",
                        carbsG: "",
                        fatG: "",
                      };
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </td>
          </tr>
        {/if}

        {#each meals as meal (meal.id)}
          {#if editingId === meal.id}
            <tr class="edit-row">
              <td colspan="6">
                <form
                  method="POST"
                  action="?/updateMeal"
                  class="meal-form"
                  use:enhance={() => {
                    return async ({ result, update }) => {
                      if (result.type === "success") {
                        await refreshAfterMutation(update, () => {
                          editingId = null;
                        });
                        return;
                      }
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="id" value={meal.id} />
                  <input
                    type="text"
                    name="name"
                    bind:value={editing.name}
                    required
                  />
                  <input
                    type="number"
                    name="calories"
                    bind:value={editing.calories}
                  />
                  <input
                    type="number"
                    name="proteinG"
                    bind:value={editing.proteinG}
                    step="0.1"
                  />
                  <input
                    type="number"
                    name="carbsG"
                    bind:value={editing.carbsG}
                    step="0.1"
                  />
                  <input
                    type="number"
                    name="fatG"
                    bind:value={editing.fatG}
                    step="0.1"
                  />
                  <div class="actions">
                    <button class="btn sm" type="submit">Save</button>
                    <button
                      class="btn sm ghost"
                      type="button"
                      onclick={() => (editingId = null)}>Cancel</button
                    >
                  </div>
                </form>
              </td>
            </tr>
          {:else}
            <tr>
              <td class="meal-name">{meal.name}</td>
              <td>{meal.calories ?? "—"}</td>
              <td>{meal.proteinG ?? "—"}</td>
              <td>{meal.carbsG ?? "—"}</td>
              <td>{meal.fatG ?? "—"}</td>
              <td class="actions">
                <button class="btn sm ghost" onclick={() => startEdit(meal)}
                  >Edit</button
                >
                <form
                  method="POST"
                  action="?/deleteMeal"
                  use:enhance
                  onsubmit={(event) => {
                    if (!confirm("Delete this meal?")) event.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={meal.id} />
                  <button class="btn sm danger" type="submit">Delete</button>
                </form>
              </td>
            </tr>
          {/if}
        {:else}
          <tr>
            <td colspan="6" class="empty">No meals yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    font-size: 1.2rem;
    font-weight: 600;
  }

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
  thead {
    background: $color-surface;
  }
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
  tr:first-child td {
    border-top: none;
  }
  tbody tr:hover td {
    background: $color-surface-2;
  }

  .meal-name {
    font-weight: 500;
  }

  .edit-row td {
    padding: 6px;
    background: $color-surface;
  }
  .meal-form {
    display: grid;
    grid-template-columns: minmax(140px, 2fr) repeat(4, minmax(90px, 1fr)) auto;
    gap: 6px;
    align-items: center;
  }
  input {
    width: 100%;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: 5px 8px;
    color: $color-text;
    &:focus {
      outline: 2px solid $color-accent;
      border-color: transparent;
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
    &:hover {
      opacity: 0.85;
    }
    &.sm {
      padding: 3px 10px;
      font-size: 0.8rem;
    }
    &.ghost {
      background: $color-surface;
      color: $color-text-muted;
      border: 1px solid $color-border;
    }
    &.danger {
      background: $color-danger;
    }
  }

  .empty {
    text-align: center;
    color: $color-text-muted;
    padding: 32px;
  }
</style>
