<script lang="ts">
  import type { BonusItem } from '$lib/database/schema'
  import { useI18n } from '$lib/i18n-context'

  const { t } = useI18n()

  type BonusFields = {
    name: string
    calories: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    fiberG?: number | null
    sugarG?: number | null
    saturatedFatG?: number | null
    saltG?: number | null
  }

  const presets = [
    {
      name: 'Pizza',
      calories: 800,
      proteinG: 32,
      carbsG: 96,
      fatG: 32,
      fiberG: 6,
      sugarG: 8,
      saturatedFatG: 14,
      saltG: 3.2,
    },
    {
      name: 'Fast food',
      calories: 1000,
      proteinG: 35,
      carbsG: 110,
      fatG: 48,
      fiberG: 8,
      sugarG: 15,
      saturatedFatG: 16,
      saltG: 4,
    },
    {
      name: 'Beer',
      calories: 210,
      proteinG: 2,
      carbsG: 18,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      saturatedFatG: 0,
      saltG: 0.02,
    },
    {
      name: 'Dessert',
      calories: 450,
      proteinG: 6,
      carbsG: 58,
      fatG: 22,
      fiberG: 3,
      sugarG: 40,
      saturatedFatG: 13,
      saltG: 0.5,
    },
  ] as const satisfies readonly Required<BonusFields>[]

  let {
    date,
    items,
    onAdd,
    onDelete,
  }: {
    date: string
    items: BonusItem[]
    onAdd: (date: string, fields: BonusFields) => void
    onDelete: (id: number) => void
  } = $props()

  let dialogEl: HTMLDialogElement
  let open = $state(false)
  let name = $state('')
  // bind:value on type="number" inputs gives a number (or null when empty), not a string
  let calories: number | null = $state(null)
  let proteinG: number | null = $state(null)
  let carbsG: number | null = $state(null)
  let fatG: number | null = $state(null)
  let fiberG: number | null = $state(null)
  let sugarG: number | null = $state(null)
  let saturatedFatG: number | null = $state(null)
  let saltG: number | null = $state(null)

  function openForm() {
    name = ''
    calories = proteinG = carbsG = fatG = null
    fiberG = sugarG = saturatedFatG = saltG = null
    open = true
    dialogEl?.showModal()
  }

  function submit(e: Event) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(date, {
      name: name.trim(),
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      sugarG,
      saturatedFatG,
      saltG,
    })
    dialogEl?.close()
    open = false
  }

  function usePreset(preset: (typeof presets)[number]) {
    name = t(preset.name)
    calories = preset.calories
    proteinG = preset.proteinG
    carbsG = preset.carbsG
    fatG = preset.fatG
    fiberG = preset.fiberG
    sugarG = preset.sugarG
    saturatedFatG = preset.saturatedFatG
    saltG = preset.saltG
  }
</script>

<div class="bonus-col">
  {#each items as item (item.id)}
    <div class="bonus-item">
      <span class="name" title={item.name}>{item.name}</span>
      {#if item.calories !== null}<span class="kcal">{item.calories}</span>{/if}
      <button
        class="del"
        onclick={() => onDelete(item.id)}
        aria-label={t('Remove {name}', { name: item.name })}>×</button
      >
    </div>
  {/each}
  <button class="add-btn" onclick={openForm}>{t('+ extra')}</button>
</div>

<dialog bind:this={dialogEl} onclose={() => (open = false)}>
  {#if open}
    <form class="bonus-form" onsubmit={submit}>
      <h4>{t('Add off-plan item')}</h4>
      <fieldset class="presets">
        <legend>{t('Quick picks')}</legend>
        <div class="preset-buttons">
          {#each presets as preset}
            <button type="button" onclick={() => usePreset(preset)}
              >{t(preset.name)}</button
            >
          {/each}
        </div>
        <small>{t('Estimated nutrition — adjust if needed.')}</small>
      </fieldset>
      <input
        type="text"
        placeholder={t('Name (e.g. Pizza, Beer)')}
        bind:value={name}
      />
      <input
        type="number"
        placeholder={t('Calories')}
        bind:value={calories}
        min="0"
      />
      <div class="macro-row">
        <input
          type="number"
          placeholder={t('Protein g')}
          bind:value={proteinG}
          min="0"
          step="0.1"
        />
        <input
          type="number"
          placeholder={t('Carbs g')}
          bind:value={carbsG}
          min="0"
          step="0.1"
        />
        <input
          type="number"
          placeholder={t('Fat g')}
          bind:value={fatG}
          min="0"
          step="0.1"
        />
      </div>
      <div class="macro-row">
        <input
          type="number"
          placeholder={t('Fibre g')}
          bind:value={fiberG}
          min="0"
          step="0.01"
        />
        <input
          type="number"
          placeholder={t('Sugars g')}
          bind:value={sugarG}
          min="0"
          step="0.01"
        />
      </div>
      <div class="macro-row">
        <input
          type="number"
          placeholder={t('Saturated fat g')}
          bind:value={saturatedFatG}
          min="0"
          step="0.01"
        />
        <input
          type="number"
          placeholder={t('Salt g')}
          bind:value={saltG}
          min="0"
          step="0.01"
        />
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn-ghost"
          onclick={() => dialogEl?.close()}>{t('Cancel')}</button
        >
        <button type="submit" class="btn-add">{t('Add')}</button>
      </div>
    </form>
  {/if}
</dialog>

<style lang="scss">
  .bonus-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .bonus-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    color: $color-text-muted;
    background: #f5f1e9;
    border-radius: $radius-sm;
    padding: 4px 6px;
  }
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kcal {
    white-space: nowrap;
  }
  .del {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    line-height: 1;
    padding: 0 2px;
    &:hover {
      color: $color-danger;
    }
  }
  .add-btn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 0.68rem;
    text-align: left;
    padding: 1px 2px;
    &:hover {
      color: $color-text;
    }
  }

  dialog {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    padding: 0;
    max-width: 380px;
    width: 90vw;
    color: $color-text;

    &::backdrop {
      background: rgb(41 39 33 / 52%);
      backdrop-filter: blur(3px);
    }
  }
  .bonus-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;

    h4 {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.2rem;
      font-weight: 500;
    }

    input {
      min-height: 42px;
      background: $color-surface;
      border: 1px solid $color-border-strong;
      border-radius: $radius-sm;
      padding: 9px 10px;
      color: $color-text;
      font-size: 0.85rem;
      width: 100%;
      &:focus {
        outline: 2px solid $color-accent;
        border-color: transparent;
      }
    }
  }
  .macro-row {
    display: flex;
    gap: 6px;
  }
  .presets {
    margin: 0;
    padding: 0;
    border: 0;

    legend {
      margin-bottom: 6px;
      color: $color-text-muted;
      font-size: 0.75rem;
    }

    small {
      display: block;
      margin-top: 5px;
      color: $color-text-muted;
      font-size: 0.68rem;
    }
  }
  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    button {
      padding: 5px 9px;
      background: $color-surface;
      border: 1px solid $color-border-strong;
      border-radius: 999px;
      color: $color-text;
      cursor: pointer;
      font-size: 0.75rem;

      &:hover {
        border-color: $color-accent;
      }
    }
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .btn-ghost {
    padding: 4px 12px;
    background: $color-surface;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 0.78rem;
  }
  .btn-add {
    padding: 4px 12px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 500;
  }
</style>
