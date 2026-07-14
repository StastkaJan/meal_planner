<script lang="ts">
  import {
    CUISINE_OPTIONS,
    DIET_OPTIONS,
    DIFF_LABEL,
    MEAL_TYPES,
  } from '$lib/types'
  import type { Meal } from '$lib/schema'

  let {
    meal,
    onCancel,
    onSaved,
  }: {
    meal: Meal
    onCancel: () => void
    onSaved: () => void
  } = $props()

  let tags = $derived(meal.tags ?? [])
  let allowedSlots = $derived(meal.allowedSlots ?? [])

  function toggleTag(opt: string) {
    tags = tags.includes(opt) ? tags.filter((t) => t !== opt) : [...tags, opt]
  }

  function toggleSlot(opt: string) {
    allowedSlots = allowedSlots.includes(opt)
      ? allowedSlots.filter((t) => t !== opt)
      : [...allowedSlots, opt]
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const body: Record<string, unknown> = Object.fromEntries(fd)
    body.tags = fd.getAll('tags')
    body.allowedSlots = fd.getAll('allowedSlots')
    const res = await fetch(`/meals/${meal.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) onSaved()
  }
</script>

<form method="POST" class="edit-form" onsubmit={handleSave}>
  <div class="field-row">
    <label
      >Name<input type="text" name="name" value={meal.name} autofocus /></label
    >
    <label
      >Image URL<input
        type="url"
        name="imageUrl"
        value={meal.imageUrl ?? ''}
      /></label
    >
    <label
      >Time (min)<input
        type="number"
        name="timeMinutes"
        value={meal.timeMinutes ?? ''}
      /></label
    >
    <label
      >Difficulty
      <select name="difficulty">
        <option value="">—</option>
        {#each ['easy', 'medium', 'hard'] as d}
          <option value={d} selected={meal.difficulty === d}
            >{DIFF_LABEL[d]}</option
          >
        {/each}
      </select>
    </label>
  </div>
  <div class="field-row">
    <label
      >Calories<input
        type="number"
        name="calories"
        value={meal.calories ?? ''}
      /></label
    >
    <label
      >Protein (g)<input
        type="number"
        step="0.1"
        name="proteinG"
        value={meal.proteinG ?? ''}
      /></label
    >
    <label
      >Carbs (g)<input
        type="number"
        step="0.1"
        name="carbsG"
        value={meal.carbsG ?? ''}
      /></label
    >
    <label
      >Fat (g)<input
        type="number"
        step="0.1"
        name="fatG"
        value={meal.fatG ?? ''}
      /></label
    >
  </div>
  <div class="field-row">
    <label
      >Servings<input
        type="number"
        min="1"
        name="servings"
        value={meal.servings ?? 1}
      /></label
    >
  </div>
  <fieldset class="tags-field">
    <legend>Cuisine</legend>
    <div class="chips">
      {#each CUISINE_OPTIONS as opt}
        <label class="chip" class:active={tags.includes(opt)}>
          <input
            type="checkbox"
            name="tags"
            value={opt}
            checked={tags.includes(opt)}
            onchange={() => toggleTag(opt)}
          />
          {opt.replace('_', ' ')}
        </label>
      {/each}
    </div>
  </fieldset>
  <fieldset class="tags-field">
    <legend>Diet</legend>
    <div class="chips">
      {#each DIET_OPTIONS as opt}
        <label class="chip" class:active={tags.includes(opt)}>
          <input
            type="checkbox"
            name="tags"
            value={opt}
            checked={tags.includes(opt)}
            onchange={() => toggleTag(opt)}
          />
          {opt.replace('_', ' ')}
        </label>
      {/each}
    </div>
  </fieldset>
  <fieldset class="tags-field">
    <legend>Allowed slots <span class="hint">(none = any)</span></legend>
    <div class="chips">
      {#each MEAL_TYPES as opt}
        <label class="chip" class:active={allowedSlots.includes(opt)}>
          <input
            type="checkbox"
            name="allowedSlots"
            value={opt}
            checked={allowedSlots.includes(opt)}
            onchange={() => toggleSlot(opt)}
          />
          {opt.replace('_', ' ')}
        </label>
      {/each}
    </div>
  </fieldset>
  <label
    >Description<textarea name="description" rows="2"
      >{meal.description ?? ''}</textarea
    ></label
  >
  <label
    >Ingredients <span class="hint">(one per line)</span>
    <textarea name="ingredients" rows="6"
      >{meal.ingredients?.join('\n') ?? ''}</textarea
    >
  </label>
  <label
    >Instructions<textarea name="instructions" rows="8"
      >{meal.instructions ?? ''}</textarea
    ></label
  >
  <div class="form-actions">
    <button class="btn" type="submit">Save</button>
    <button class="btn ghost" type="button" onclick={onCancel}>Cancel</button>
  </div>
</form>

<style lang="scss">
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
    min-width: 0;

    .hint {
      font-weight: 400;
    }

    input,
    select,
    textarea {
      width: 100%;
      background: $color-surface-2;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 6px 8px;
      color: $color-text;
      font-size: 0.875rem;
      &:focus {
        outline: 2px solid $color-accent;
        border-color: transparent;
      }
    }
    textarea {
      resize: vertical;
      font-family: inherit;
    }
  }

  .tags-field {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    legend {
      padding: 0;
      font-size: 0.8rem;
      font-weight: 500;
      color: $color-text-muted;
    }
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: 999px;
    font-size: 0.78rem;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;

    &.active {
      background: $color-accent-dim;
      border-color: $color-accent;
      color: $color-text;
    }

    input {
      display: none;
    }
  }

  .form-actions {
    display: flex;
    gap: 8px;
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
    &.ghost {
      background: $color-surface;
      color: $color-text-muted;
      border: 1px solid $color-border;
    }
  }
</style>
