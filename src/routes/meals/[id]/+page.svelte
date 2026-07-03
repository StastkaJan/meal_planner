<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let editing = $state(false);

  const diffLabel: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
</script>

<div class="page">
  {#if editing}
    <form method="POST" action="?/update" class="edit-form"
      use:enhance={() => async ({ result, update }) => {
        if (result.type !== 'failure') editing = false;
        await update();
      }}>
      <div class="field-row">
        <label>Name<input type="text" name="name" value={data.meal.name} autofocus /></label>
        <label>Image URL<input type="url" name="imageUrl" value={data.meal.imageUrl ?? ''} /></label>
        <label>Time (min)<input type="number" name="timeMinutes" value={data.meal.timeMinutes ?? ''} /></label>
        <label>Difficulty
          <select name="difficulty">
            <option value="">—</option>
            {#each ['easy', 'medium', 'hard'] as d}
              <option value={d} selected={data.meal.difficulty === d}>{diffLabel[d]}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="field-row">
        <label>Calories<input type="number" name="calories" value={data.meal.calories ?? ''} /></label>
        <label>Protein (g)<input type="number" step="0.1" name="proteinG" value={data.meal.proteinG ?? ''} /></label>
        <label>Carbs (g)<input type="number" step="0.1" name="carbsG" value={data.meal.carbsG ?? ''} /></label>
        <label>Fat (g)<input type="number" step="0.1" name="fatG" value={data.meal.fatG ?? ''} /></label>
      </div>
      <label>Description<textarea name="description" rows="2">{data.meal.description ?? ''}</textarea></label>
      <label>Ingredients <span class="hint">(one per line)</span>
        <textarea name="ingredients" rows="6">{data.meal.ingredients?.join('\n') ?? ''}</textarea>
      </label>
      <label>Instructions<textarea name="instructions" rows="8">{data.meal.instructions ?? ''}</textarea></label>
      <div class="form-actions">
        <button class="btn" type="submit">Save</button>
        <button class="btn ghost" type="button" onclick={() => (editing = false)}>Cancel</button>
      </div>
    </form>
  {:else}
    <div class="top-bar">
      <a class="back" href="/meals">← Meals</a>
      <div class="actions">
        <button class="btn ghost sm" onclick={() => (editing = true)}>Edit</button>
        <form method="POST" action="?/delete" use:enhance
          onsubmit={(e) => { if (!confirm('Delete this meal?')) e.preventDefault(); }}>
          <button class="btn danger sm" type="submit">Delete</button>
        </form>
      </div>
    </div>

    <div class="detail">
      {#if data.meal.imageUrl}
        <img class="hero" src={data.meal.imageUrl} alt={data.meal.name} />
      {/if}

      <div class="header">
        <h1>{data.meal.name}</h1>
        <div class="meta">
          {#if data.meal.timeMinutes}<span class="badge">{data.meal.timeMinutes} min</span>{/if}
          {#if data.meal.difficulty}<span class="badge diff-{data.meal.difficulty}">{diffLabel[data.meal.difficulty] ?? data.meal.difficulty}</span>{/if}
        </div>
      </div>

      {#if data.meal.calories || data.meal.proteinG || data.meal.carbsG || data.meal.fatG}
        <div class="nutrition">
          {#if data.meal.calories}<span>{data.meal.calories} kcal</span>{/if}
          {#if data.meal.proteinG}<span>{data.meal.proteinG}g protein</span>{/if}
          {#if data.meal.carbsG}<span>{data.meal.carbsG}g carbs</span>{/if}
          {#if data.meal.fatG}<span>{data.meal.fatG}g fat</span>{/if}
        </div>
      {/if}

      {#if data.meal.description}
        <p class="description">{data.meal.description}</p>
      {/if}

      {#if data.meal.ingredients?.length}
        <section>
          <h2>Ingredients</h2>
          <ul>
            {#each data.meal.ingredients as ing}
              <li>{ing}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if data.meal.instructions}
        <section>
          <h2>Instructions</h2>
          <p class="instructions">{data.meal.instructions}</p>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .page { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .back {
    font-size: 0.875rem;
    color: $color-text-muted;
    text-decoration: none;
    &:hover { color: $color-text; }
  }
  .actions { display: flex; gap: 6px; align-items: center; }

  .detail { display: flex; flex-direction: column; gap: 20px; }

  .hero {
    width: 100%;
    max-height: 360px;
    object-fit: cover;
    border-radius: $radius-sm;
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  h1 { font-size: 1.5rem; font-weight: 700; flex: 1; }
  h2 { font-size: 1rem; font-weight: 600; margin-bottom: 8px; }

  .meta { display: flex; gap: 6px; align-items: center; padding-top: 4px; }

  .badge {
    font-size: 0.75rem;
    padding: 3px 9px;
    border-radius: 9999px;
    background: $color-surface-2;
    color: $color-text-muted;
    font-weight: 500;

    &.diff-easy   { background: #d1fae5; color: #065f46; }
    &.diff-medium { background: #fef3c7; color: #92400e; }
    &.diff-hard   { background: #fee2e2; color: #991b1b; }
  }

  .nutrition {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: $color-text-muted;
    flex-wrap: wrap;
  }

  .description { color: $color-text-muted; line-height: 1.6; }

  section { display: flex; flex-direction: column; }

  ul {
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .instructions {
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
  }

  .field-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    color: $color-text-muted;

    .hint { font-weight: 400; }

    input, select, textarea {
      background: $color-surface-2;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 6px 8px;
      color: $color-text;
      font-size: 0.875rem;
      &:focus { outline: 2px solid $color-accent; border-color: transparent; }
    }
    textarea { resize: vertical; font-family: inherit; }
  }

  .form-actions { display: flex; gap: 8px; }

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
</style>
