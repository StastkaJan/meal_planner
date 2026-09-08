<script lang="ts">
  import { EXTRA_PRESETS, type ExtraFields } from '$lib/domain/extras'
  import type { BonusItem, SavedExtra } from '$lib/database/schema'
  import { useI18n } from '$lib/i18n-context'

  const { t, message } = useI18n()

  let {
    date,
    items,
    onAdd,
    onDelete,
    savedExtras,
    onSave,
    onDeleteSaved,
  }: {
    date: string
    items: BonusItem[]
    onAdd: (date: string, fields: ExtraFields) => Promise<void>
    savedExtras: SavedExtra[]
    onSave: (fields: ExtraFields) => Promise<void>
    onDeleteSaved: (id: number) => Promise<void>
    onDelete: (id: number) => void
  } = $props()

  let dialogEl: HTMLDialogElement
  let open = $state(false)
  let editing = $state(false)
  let query = $state('')
  let saveForLater = $state(false)
  let busy = $state(false)
  let error = $state('')
  const choices = $derived(
    [
      ...EXTRA_PRESETS.map((extra) => ({
        ...extra,
        name: t(extra.name),
        id: null as number | null,
      })),
      ...savedExtras,
    ].filter((extra) =>
      extra.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    ),
  )
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
    editing = false
    query = ''
    saveForLater = false
    error = ''
    calories = proteinG = carbsG = fatG = null
    fiberG = sugarG = saturatedFatG = saltG = null
    open = true
    dialogEl?.showModal()
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!name.trim() || busy) return
    const fields = {
      name: name.trim(),
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      sugarG,
      saturatedFatG,
      saltG,
    }
    busy = true
    error = ''
    try {
      if (saveForLater) {
        await onSave(fields)
        saveForLater = false
      }
      await onAdd(date, fields)
      dialogEl?.close()
      open = false
    } catch (cause) {
      error = message(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      busy = false
    }
  }

  function usePreset(preset: ExtraFields) {
    editing = true
    saveForLater = false
    name = preset.name
    calories = preset.calories
    proteinG = preset.proteinG
    carbsG = preset.carbsG
    fatG = preset.fatG
    fiberG = preset.fiberG
    sugarG = preset.sugarG
    saturatedFatG = preset.saturatedFatG
    saltG = preset.saltG
  }
  async function removeSaved(id: number) {
    if (busy) return
    busy = true
    error = ''
    try {
      await onDeleteSaved(id)
    } catch (cause) {
      error = message(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      busy = false
    }
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

<dialog
  bind:this={dialogEl}
  aria-label={t('Add off-plan item')}
  oncancel={(event) => {
    if (busy) event.preventDefault()
  }}
  onclose={() => (open = false)}
>
  {#if open}
    <header class="dialog-heading">
      <h4>{t('Add off-plan item')}</h4>
      <button
        type="button"
        disabled={busy}
        aria-label={t('Close')}
        onclick={() => dialogEl.close()}>×</button
      >
    </header>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if !editing}
      <div class="extra-browser">
        <input
          type="search"
          aria-label={t('Search extras')}
          placeholder={t('Search extras')}
          bind:value={query}
        />
        <button
          type="button"
          class="custom-extra"
          onclick={() => {
            name = ''
            calories = proteinG = carbsG = fatG = null
            fiberG = sugarG = saturatedFatG = saltG = null
            saveForLater = false
            error = ''
            editing = true
          }}>{t('Custom extra')}</button
        >
        <ul class="extra-list">
          {#each choices as extra}
            <li>
              <button
                type="button"
                class="extra-choice"
                aria-label={extra.name}
                onclick={() => usePreset(extra)}
              >
                <span
                  >{extra.name}<small
                    >{extra.id === null
                      ? t('Quick picks')
                      : t('Saved extras')}</small
                  ></span
                >
                {#if extra.calories !== null}<span class="choice-kcal"
                    >{extra.calories} kcal</span
                  >{/if}
              </button>
              {#if extra.id !== null}<button
                  type="button"
                  class="remove-saved"
                  disabled={busy}
                  aria-label={t('Delete saved extra {name}', {
                    name: extra.name,
                  })}
                  onclick={() => removeSaved(extra.id!)}>×</button
                >{/if}
            </li>
          {:else}<li class="no-results">{t('No extras found')}</li>{/each}
        </ul>
      </div>
    {:else}
      <form class="bonus-form" onsubmit={submit}>
        <button
          type="button"
          class="back"
          disabled={busy}
          onclick={() => {
            editing = false
          }}>{t('Back to extras')}</button
        >
        <small>{t('Estimated nutrition — adjust if needed.')}</small>
        <label>
          <span>{t('Name')}</span>
          <input
            type="text"
            placeholder={t('Name (e.g. Pizza, Beer)')}
            bind:value={name}
            required
            maxlength="200"
          />
        </label>
        <label>
          <span>{t('Calories')}</span>
          <input type="number" bind:value={calories} min="0" />
        </label>
        <div class="macro-row">
          <label>
            <span>{t('Protein g')}</span>
            <input type="number" bind:value={proteinG} min="0" step="0.1" />
          </label>
          <label>
            <span>{t('Carbs g')}</span>
            <input type="number" bind:value={carbsG} min="0" step="0.1" />
          </label>
          <label>
            <span>{t('Fat g')}</span>
            <input type="number" bind:value={fatG} min="0" step="0.1" />
          </label>
        </div>
        <div class="macro-row">
          <label>
            <span>{t('Fibre g')}</span>
            <input type="number" bind:value={fiberG} min="0" step="0.01" />
          </label>
          <label>
            <span>{t('Sugars g')}</span>
            <input type="number" bind:value={sugarG} min="0" step="0.01" />
          </label>
        </div>
        <div class="macro-row">
          <label>
            <span>{t('Saturated fat g')}</span>
            <input
              type="number"
              bind:value={saturatedFatG}
              min="0"
              step="0.01"
            />
          </label>
          <label>
            <span>{t('Salt g')}</span>
            <input type="number" bind:value={saltG} min="0" step="0.01" />
          </label>
        </div>
        <label class="save-extra"
          ><input
            type="checkbox"
            bind:checked={saveForLater}
            disabled={busy}
          /><span>{t('Save for later')}</span></label
        >
        <div class="actions">
          <button
            type="button"
            class="btn-ghost"
            disabled={busy}
            onclick={() => dialogEl?.close()}>{t('Cancel')}</button
          >
          <button type="submit" class="btn-add" disabled={busy || !name.trim()}
            >{t('Add')}</button
          >
        </div>
      </form>
    {/if}
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
    max-width: 460px;
    max-height: 90dvh;
    overflow-y: auto;
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

    label {
      flex: 1;
      min-width: 0;
    }
  }
  .bonus-form > label,
  .macro-row label {
    display: grid;
    gap: 4px;
    color: $color-text-muted;
    font-size: 0.72rem;
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
  .dialog-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid $color-border;
    h4 {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.2rem;
      font-weight: 500;
    }
    button {
      border: 0;
      background: transparent;
      color: $color-text;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 1.2rem;
    }
  }
  .extra-browser {
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  .extra-browser input {
    width: 100%;
    min-height: 44px;
    padding: 10px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;
  }
  .custom-extra,
  .back {
    min-height: 40px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    cursor: pointer;
  }
  .extra-list {
    list-style: none;
    max-height: 320px;
    overflow-y: auto;
    li {
      display: flex;
      border-bottom: 1px solid $color-border;
    }
  }
  .extra-choice {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 8px;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
    span {
      overflow-wrap: anywhere;
    }
    small {
      display: block;
      font-size: 0.7rem;
      color: $color-text-muted;
    }
    &:hover {
      background: $color-surface-2;
    }
  }
  .choice-kcal {
    white-space: nowrap;
    font-size: 0.75rem;
    color: $color-text-muted;
  }
  .remove-saved {
    width: 36px;
    flex-shrink: 0;
    border: 0;
    background: transparent;
    color: $color-danger;
    cursor: pointer;
    font-size: 1.1rem;
  }
  .no-results,
  .error {
    padding: 12px;
    font-size: 0.8rem;
  }
  .error {
    color: $color-danger;
  }
  .bonus-form .save-extra {
    display: flex;
    align-items: center;
    gap: 8px;
    input {
      width: 18px;
      min-height: 18px;
    }
  }
  .btn-add,
  .btn-ghost {
    min-height: 40px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
