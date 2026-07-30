<script lang="ts">
  import { updateMeal } from '$lib/api/meals'
  import Textarea from '$lib/components/ui/Textarea.svelte'
  import {
    CUISINE_OPTIONS,
    DIET_OPTIONS,
    DIFF_LABEL,
    MEAL_TYPES,
    UNIT_OPTIONS,
  } from '$lib/constants'
  import type { Meal } from '$lib/database/schema'
  import type { IngredientInput } from '$lib/types'

  let {
    meal,
    ingredients,
    onCancel,
    onSaved,
  }: {
    meal: Meal
    ingredients: IngredientInput[]
    onCancel: () => void
    onSaved: (meal: Meal) => void
  } = $props()

  let tags = $derived(meal.tags ?? [])
  let allowedSlots = $derived(meal.allowedSlots ?? [])

  type IngredientRow = { name: string; qty: number | ''; unit: string }
  const emptyRow = (): IngredientRow => ({ name: '', qty: '', unit: '' })
  let ingredientRows = $derived.by<IngredientRow[]>(() =>
    ingredients.length
      ? ingredients.map((i) => ({
          name: i.name,
          qty: i.qty ?? '',
          unit: i.unit ?? '',
        }))
      : [emptyRow()],
  )

  function addIngredientRow() {
    ingredientRows = [...ingredientRows, emptyRow()]
  }

  function removeIngredientRow(i: number) {
    ingredientRows = ingredientRows.filter((_, idx) => idx !== i)
  }

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
    body.ingredients = ingredientRows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        qty: r.qty === '' ? null : Number(r.qty),
        unit: r.unit || null,
      }))
    onSaved(await updateMeal(meal.id, body))
  }
</script>

<form method="POST" class="edit-form" onsubmit={handleSave}>
  <div class="field-row">
    <label>Name<input type="text" name="name" value={meal.name} /></label>
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
    >Description<Textarea
      name="description"
      rows={2}
      value={meal.description ?? ''}
    /></label
  >
  <fieldset class="ingredients-field">
    <legend>Ingredients</legend>
    <div class="ingredient-rows">
      {#each ingredientRows as row, i}
        <div class="ingredient-row">
          <input type="text" placeholder="Ingredient" bind:value={row.name} />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Qty"
            bind:value={row.qty}
          />
          <select bind:value={row.unit}>
            <option value="">—</option>
            {#each UNIT_OPTIONS as u}
              <option value={u}>{u}</option>
            {/each}
          </select>
          <button
            class="btn sm ghost"
            type="button"
            aria-label="Remove ingredient"
            onclick={() => removeIngredientRow(i)}>×</button
          >
        </div>
      {/each}
    </div>
    <button class="btn sm ghost" type="button" onclick={addIngredientRow}
      >+ Add ingredient</button
    >
  </fieldset>
  <label
    >Instructions<Textarea
      name="instructions"
      rows={8}
      value={meal.instructions ?? ''}
    /></label
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

    input,
    select {
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

  .ingredients-field {
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

  .ingredient-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ingredient-row {
    display: grid;
    grid-template-columns: 3fr 1fr 1fr auto;
    gap: 8px;

    input,
    select {
      background: $color-surface-2;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 6px 8px;
      color: $color-text;
      font-size: 0.875rem;
      width: 100%;
      &:focus {
        outline: 2px solid $color-accent;
        border-color: transparent;
      }
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
    &.sm {
      padding: 3px 10px;
      font-size: 0.8rem;
    }
    &.ghost {
      background: $color-surface;
      color: $color-text-muted;
      border: 1px solid $color-border;
    }
  }
</style>
