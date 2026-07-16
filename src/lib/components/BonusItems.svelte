<script lang="ts">
  import type { BonusItem } from '$lib/schema'

  type BonusFields = {
    name: string
    calories: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
  }

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
  let calories = $state('')
  let proteinG = $state('')
  let carbsG = $state('')
  let fatG = $state('')

  function openForm() {
    name = calories = proteinG = carbsG = fatG = ''
    open = true
    dialogEl?.showModal()
  }

  function toNum(v: string): number | null {
    const n = Number(v)
    return v.trim() && Number.isFinite(n) ? n : null
  }

  function submit(e: Event) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(date, {
      name: name.trim(),
      calories: toNum(calories),
      proteinG: toNum(proteinG),
      carbsG: toNum(carbsG),
      fatG: toNum(fatG),
    })
    dialogEl?.close()
    open = false
  }
</script>

<div class="bonus-col">
  {#each items as item (item.id)}
    <div class="bonus-item">
      <span class="name" title={item.name}>{item.name}</span>
      {#if item.calories}<span class="kcal">{item.calories}</span>{/if}
      <button
        class="del"
        onclick={() => onDelete(item.id)}
        aria-label="Remove {item.name}">×</button
      >
    </div>
  {/each}
  <button class="add-btn" onclick={openForm}>+ extra</button>
</div>

<dialog bind:this={dialogEl} onclose={() => (open = false)}>
  {#if open}
    <form class="bonus-form" onsubmit={submit}>
      <h4>Add off-plan item</h4>
      <input
        type="text"
        placeholder="Name (e.g. Pizza, Beer)"
        bind:value={name}
        autofocus
      />
      <input
        type="number"
        placeholder="Calories"
        bind:value={calories}
        min="0"
      />
      <div class="macro-row">
        <input
          type="number"
          placeholder="Protein g"
          bind:value={proteinG}
          min="0"
          step="0.1"
        />
        <input
          type="number"
          placeholder="Carbs g"
          bind:value={carbsG}
          min="0"
          step="0.1"
        />
        <input
          type="number"
          placeholder="Fat g"
          bind:value={fatG}
          min="0"
          step="0.1"
        />
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn-ghost"
          onclick={() => dialogEl?.close()}>Cancel</button
        >
        <button type="submit" class="btn-add">Add</button>
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
    background: $color-surface-2;
    border-radius: $radius-sm;
    padding: 2px 4px;
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
    max-width: 320px;
    width: 90vw;
    color: $color-text;

    &::backdrop {
      background: rgba(0, 0, 0, 0.6);
    }
  }
  .bonus-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;

    h4 {
      margin: 0;
      font-size: 0.85rem;
    }

    input {
      background: $color-surface-2;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 6px 8px;
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
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .btn-ghost {
    padding: 4px 12px;
    background: $color-surface;
    border: 1px solid $color-border;
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
