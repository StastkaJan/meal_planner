<script lang="ts">
  import type { Meal } from '$lib/database/schema'
  import type { SlotWithMeal } from '$lib/types'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import MealPicker from './MealPicker.svelte'

  let {
    slot,
    meals,
    mealType,
    onPick,
    onFeedback,
  }: {
    slot: SlotWithMeal | null
    meals: Meal[]
    mealType: string
    onPick: (mealId: number | null) => void
    onFeedback: (
      outcome: 'cooked' | 'skipped' | null,
      rating: number | null,
    ) => void
  } = $props()

  let dialogEl = $state<HTMLDialogElement>()
  let open = $state(false)

  function openPicker() {
    open = true
    dialogEl?.showModal()
  }

  function handlePick(mealId: number | null) {
    onPick(mealId)
    dialogEl?.close()
    open = false
  }
</script>

{#if slot?.mealName}
  <div class="cell {mealType}">
    <div class="meal-info">
      <span class="name">{slot.mealName}</span>
      {#if slot.calories}
        <span class="kcal">{slot.calories} kcal</span>
      {/if}
    </div>
    <div class="actions">
      <button
        type="button"
        onclick={openPicker}
        title="Edit meal assignment"
        aria-label="Edit meal assignment">✎</button
      >
      <a
        href="/meals/{slot.mealId}"
        title="Show recipe"
        aria-label="Show recipe">↗</a
      >
      <button
        type="button"
        onclick={() => onPick(null)}
        title="Remove meal"
        aria-label="Remove meal">×</button
      >
    </div>
    <div class="feedback" aria-label="Meal feedback">
      <button
        type="button"
        class:active={slot.outcome === 'cooked'}
        aria-pressed={slot.outcome === 'cooked'}
        onclick={() =>
          onFeedback(slot.outcome === 'cooked' ? null : 'cooked', null)}
        >Cooked</button
      >
      <button
        type="button"
        class:active={slot.outcome === 'skipped'}
        aria-pressed={slot.outcome === 'skipped'}
        onclick={() =>
          onFeedback(slot.outcome === 'skipped' ? null : 'skipped', null)}
        >Skipped</button
      >
      {#if slot.outcome === 'cooked'}
        <label>
          <span class="sr-only">Rating</span>
          <select
            aria-label="Rating"
            value={slot.rating ?? ''}
            onchange={(event) =>
              onFeedback(
                'cooked',
                Number((event.currentTarget as HTMLSelectElement).value) ||
                  null,
              )}
          >
            <option value="">Rate</option>
            {#each [1, 2, 3, 4, 5] as rating}
              <option value={rating}>{rating}/5</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>
  </div>
{:else}
  <button
    class="cell {mealType}"
    onclick={openPicker}
    title="Click to assign meal"
  >
    <span class="empty">—</span>
  </button>
{/if}

<Dialog
  bind:element={dialogEl}
  class="meal-dialog"
  onclose={() => (open = false)}
>
  {#if open}
    <MealPicker
      {meals}
      current={slot?.mealId ?? null}
      {mealType}
      onSelect={handlePick}
    />
  {/if}
</Dialog>

<style lang="scss">
  .cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    height: 100%;
    min-height: 72px;
    padding: 10px;
    background: transparent;
    border: none;
    border-left: 3px solid transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;

    &:hover {
      background: #faf8f2;
    }

    &.breakfast {
      border-left-color: $color-breakfast;
    }
    &.morning_snack {
      border-left-color: $color-morning_snack;
    }
    &.lunch {
      border-left-color: $color-lunch;
    }
    &.afternoon_snack {
      border-left-color: $color-afternoon_snack;
    }
    &.dinner {
      border-left-color: $color-dinner;
    }
  }
  .meal-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
  }
  .actions {
    display: flex;
    gap: 2px;

    button,
    a {
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      place-items: center;
      border: 0;
      border-radius: $radius-sm;
      background: transparent;
      color: $color-text-muted;
      cursor: pointer;
      font-size: 0.9rem;
      line-height: 1;
      text-decoration: none;

      &:hover {
        background: $color-surface-2;
        color: $color-text;
      }
    }
  }
  .feedback {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;

    button,
    select {
      min-height: 24px;
      padding: 2px 5px;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      background: transparent;
      color: $color-text-muted;
      cursor: pointer;
      font-size: 0.62rem;
    }

    button.active {
      border-color: $color-accent-dim;
      background: $color-surface-2;
      color: $color-text;
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .name {
    font-size: 0.82rem;
    font-weight: 600;
    color: $color-text;
    line-height: 1.3;
  }
  .kcal {
    font-size: 0.7rem;
    color: $color-text-muted;
  }
  .empty {
    font-size: 0.8rem;
    color: $color-text-muted;
    opacity: 0.45;
  }
  :global(.meal-dialog) {
    padding: 0;
    max-width: 420px;
    width: 90vw;
  }
</style>
