<script lang="ts">
  import { deleteMealImage, updateMeal, uploadMealImage } from '$lib/api/meals'
  import Textarea from '$lib/components/ui/Textarea.svelte'
  import {
    CUISINE_OPTIONS,
    DIET_OPTIONS,
    MEAL_TYPES,
    UNIT_OPTIONS,
  } from '$lib/constants'
  import type { Meal } from '$lib/database/schema'
  import type { IngredientInput } from '$lib/types'
  import { useI18n } from '$lib/i18n-context'

  const { t, label } = useI18n()

  let {
    meal,
    ingredients,
    hasUploadedImage,
    onCancel,
    onSaved,
  }: {
    meal: Meal
    ingredients: IngredientInput[]
    hasUploadedImage: boolean
    onCancel: () => void
    onSaved: (meal: Meal, hasUploadedImage: boolean) => void
  } = $props()

  let tags = $derived(meal.tags ?? [])
  let allowedSlots = $derived(meal.allowedSlots ?? [])
  let imageFile = $state<File | null>(null)
  let imageDragDepth = $state(0)
  let imageDragging = $state(false)
  let removeUploadedImage = $state(false)
  let saving = $state(false)
  let saveError = $state('')

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

  function selectImage(file: File | null) {
    imageFile = file
    if (file) removeUploadedImage = false
  }

  function handleImageDragEnter(event: DragEvent) {
    event.preventDefault()
    imageDragDepth += 1
    imageDragging = true
  }

  function handleImageDragLeave(event: DragEvent) {
    event.preventDefault()
    imageDragDepth = Math.max(0, imageDragDepth - 1)
    imageDragging = imageDragDepth > 0
  }

  function handleImageDragOver(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  function handleImageDrop(event: DragEvent) {
    event.preventDefault()
    imageDragDepth = 0
    imageDragging = false
    const file = event.dataTransfer?.files[0]
    if (file) selectImage(file)
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
    saving = true
    saveError = ''
    try {
      const updated = await updateMeal(meal.id, body)
      let uploadedImage = hasUploadedImage
      if (removeUploadedImage) {
        await deleteMealImage(meal.id)
        uploadedImage = false
      }
      if (imageFile) {
        await uploadMealImage(meal.id, imageFile)
        uploadedImage = true
      }
      onSaved(updated, uploadedImage)
    } catch (cause) {
      saveError = cause instanceof Error ? cause.message : t('Request failed')
    } finally {
      saving = false
    }
  }
</script>

<form method="POST" class="edit-form" onsubmit={handleSave}>
  <div class="field-row">
    <label>{t('Name')}<input type="text" name="name" value={meal.name} /></label
    >
    <label
      >{t('Image URL')}<input
        type="url"
        name="imageUrl"
        value={meal.imageUrl ?? ''}
      /></label
    >
    <label
      >{t('Preparation (min)')}<input
        type="number"
        name="timeMinutes"
        value={meal.timeMinutes ?? ''}
      /></label
    >
    <label
      >{t('Difficulty')}
      <select name="difficulty">
        <option value="">—</option>
        {#each ['easy', 'medium', 'hard'] as d}
          <option value={d} selected={meal.difficulty === d}>{label(d)}</option>
        {/each}
      </select>
    </label>
  </div>
  <fieldset class="image-field">
    <legend>{t('Recipe image')}</legend>
    <label
      class="image-drop-zone"
      class:dragging={imageDragging}
      ondragenter={handleImageDragEnter}
      ondragleave={handleImageDragLeave}
      ondragover={handleImageDragOver}
      ondrop={handleImageDrop}
    >
      <span>{t('Drop an image here or choose a file')}</span>
      <input
        class="image-input"
        type="file"
        aria-label={t('Upload image')}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onchange={(event) =>
          selectImage(event.currentTarget.files?.[0] ?? null)}
      />
    </label>
    {#if imageFile}
      <span class="selected-image" aria-live="polite">
        {t('Selected: {name}', { name: imageFile.name })}
      </span>
    {/if}
    <span class="hint">{t('JPEG, PNG, WebP, or GIF. Maximum 5 MB.')}</span>
    {#if hasUploadedImage}
      <label class="remove-image">
        <input type="checkbox" bind:checked={removeUploadedImage} />
        {t('Remove uploaded image')}
      </label>
    {/if}
  </fieldset>
  <div class="field-row">
    <label
      >{t('Calories')}<input
        type="number"
        name="calories"
        value={meal.calories ?? ''}
      /></label
    >
    <label
      >{t('Protein (g)')}<input
        type="number"
        step="0.1"
        name="proteinG"
        value={meal.proteinG ?? ''}
      /></label
    >
    <label
      >{t('Carbs (g)')}<input
        type="number"
        step="0.1"
        name="carbsG"
        value={meal.carbsG ?? ''}
      /></label
    >
    <label
      >{t('Fat (g)')}<input
        type="number"
        step="0.1"
        name="fatG"
        value={meal.fatG ?? ''}
      /></label
    >
  </div>
  <div class="field-row">
    <label
      >{t('Fibre (g)')}<input
        type="number"
        min="0"
        step="0.01"
        name="fiberG"
        value={meal.fiberG ?? ''}
      /></label
    >
    <label
      >{t('Sugars (g)')}<input
        type="number"
        min="0"
        step="0.01"
        name="sugarG"
        value={meal.sugarG ?? ''}
      /></label
    >
    <label
      >{t('Saturated fat (g)')}<input
        type="number"
        min="0"
        step="0.01"
        name="saturatedFatG"
        value={meal.saturatedFatG ?? ''}
      /></label
    >
    <label
      >{t('Salt (g)')}<input
        type="number"
        min="0"
        step="0.01"
        name="saltG"
        value={meal.saltG ?? ''}
      /></label
    >
  </div>
  <div class="field-row">
    <label
      >{t('Servings')}<input
        type="number"
        min="1"
        name="servings"
        value={meal.servings ?? 1}
      /></label
    >
  </div>
  <fieldset class="tags-field">
    <legend>{t('Cuisine')}</legend>
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
          {label(opt)}
        </label>
      {/each}
    </div>
  </fieldset>
  <fieldset class="tags-field">
    <legend>{t('Diet')}</legend>
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
          {label(opt)}
        </label>
      {/each}
    </div>
  </fieldset>
  <fieldset class="tags-field">
    <legend
      >{t('Allowed slots')}
      <span class="hint">{t('(none = any)')}</span></legend
    >
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
          {label(opt)}
        </label>
      {/each}
    </div>
  </fieldset>
  <label
    >{t('Description')}<Textarea
      name="description"
      rows={2}
      value={meal.description ?? ''}
    /></label
  >
  <fieldset class="ingredients-field">
    <legend>{t('Ingredients')}</legend>
    <div class="ingredient-rows">
      {#each ingredientRows as row, i}
        <div class="ingredient-row">
          <input
            type="text"
            placeholder={t('Ingredient')}
            bind:value={row.name}
          />
          <input
            type="number"
            step="any"
            min="0"
            placeholder={t('Qty')}
            bind:value={row.qty}
          />
          <select bind:value={row.unit}>
            <option value="">—</option>
            {#each UNIT_OPTIONS as u}
              <option value={u}>{label(u)}</option>
            {/each}
          </select>
          <button
            class="btn sm ghost"
            type="button"
            aria-label={t('Remove ingredient')}
            onclick={() => removeIngredientRow(i)}>×</button
          >
        </div>
      {/each}
    </div>
    <button class="btn sm ghost" type="button" onclick={addIngredientRow}
      >{t('+ Add ingredient')}</button
    >
  </fieldset>
  <label
    >{t('Instructions')}<Textarea
      name="instructions"
      rows={8}
      value={meal.instructions ?? ''}
    /></label
  >
  <div class="form-actions">
    <button class="btn" type="submit" disabled={saving}
      >{saving ? t('Saving') : t('Save')}</button
    >
    <button class="btn ghost" type="button" onclick={onCancel}
      >{t('Cancel')}</button
    >
  </div>
  {#if saveError}<p class="form-error" role="alert">{saveError}</p>{/if}
</form>

<style lang="scss">
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 26px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    box-shadow: 0 16px 40px rgb(41 39 33 / 6%);
  }

  .field-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .image-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0;
    border: 0;

    legend {
      margin-bottom: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      color: $color-text-muted;
    }

    .hint {
      color: $color-text-muted;
      font-size: 0.75rem;
    }

    .image-drop-zone {
      position: relative;
      align-items: center;
      justify-content: center;
      min-height: 110px;
      padding: 18px;
      border: 2px dashed $color-border-strong;
      border-radius: $radius-sm;
      background: $color-surface-2;
      color: $color-text-muted;
      text-align: center;
      cursor: pointer;
      transition:
        background 0.15s,
        border-color 0.15s,
        color 0.15s;

      &:hover,
      &:focus-within,
      &.dragging {
        border-color: $color-accent;
        background: $color-accent-dim;
        color: $color-text;
      }

      &:focus-within {
        outline: 2px solid $color-accent;
        outline-offset: 2px;
      }

      .image-input {
        position: absolute;
        width: 1px;
        height: 1px;
        min-height: 0;
        padding: 0;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
      }
    }

    .selected-image {
      color: $color-text;
      font-size: 0.8rem;
      overflow-wrap: anywhere;
    }

    .remove-image {
      flex-direction: row;
      align-items: center;

      input {
        width: auto;
        min-height: auto;
      }
    }
  }

  .form-error {
    color: $color-danger;
    font-size: 0.8rem;
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
      min-height: 42px;
      background: $color-surface;
      border: 1px solid $color-border-strong;
      border-radius: $radius-sm;
      padding: 9px 10px;
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
    border: 1px solid $color-border-strong;
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
      background: $color-surface;
      border: 1px solid $color-border-strong;
      border-radius: $radius-sm;
      min-height: 40px;
      padding: 8px 9px;
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
    min-height: 38px;
    padding: 7px 14px;
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
      border: 1px solid $color-border-strong;
    }
  }

  @media (max-width: 720px) {
    .edit-form {
      padding: 20px;
    }
    .field-row {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 440px) {
    .field-row {
      grid-template-columns: 1fr;
    }
    .ingredient-row {
      grid-template-columns: 1fr 70px 70px auto;
    }
  }
</style>
