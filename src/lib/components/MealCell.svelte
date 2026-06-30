<script lang="ts">
  import type { SlotWithMeal } from '$lib/types';
  import type { Meal } from '$lib/schema';
  import MealPicker from './MealPicker.svelte';

  let { slot, meals, mealType, onPick }: {
    slot: SlotWithMeal | null;
    meals: Meal[];
    mealType: string;
    onPick: (mealId: number | null) => void;
  } = $props();

  let dialogEl: HTMLDialogElement;
  let open = $state(false);

  function openPicker() {
    open = true;
    dialogEl?.showModal();
  }

  function handlePick(mealId: number | null) {
    onPick(mealId);
    dialogEl?.close();
    open = false;
  }
</script>

<button class="cell {mealType}" onclick={openPicker} title="Click to assign meal">
  {#if slot?.mealName}
    <span class="name">{slot.mealName}</span>
    {#if slot.calories}
      <span class="kcal">{slot.calories} kcal</span>
    {/if}
  {:else}
    <span class="empty">—</span>
  {/if}
</button>

<dialog bind:this={dialogEl} onclose={() => open = false}>
  {#if open}
    <MealPicker {meals} current={slot?.mealId ?? null} onSelect={handlePick} />
  {/if}
</dialog>

<style lang="scss">
  .cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    min-height: 56px;
    padding: 6px 8px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;

    &:hover {
      background: $color-surface-2;
      border-color: $color-accent-dim;
    }

    &.breakfast         { border-left: 3px solid $color-breakfast; }
    &.morning_snack     { border-left: 3px solid $color-morning_snack; }
    &.lunch             { border-left: 3px solid $color-lunch; }
    &.afternoon_snack   { border-left: 3px solid $color-afternoon_snack; }
    &.dinner            { border-left: 3px solid $color-dinner; }
  }
  .name {
    font-size: 0.8rem;
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
    opacity: 0.4;
  }
  dialog {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    padding: 0;
    max-width: 420px;
    width: 90vw;
    color: $color-text;

    &::backdrop {
      background: rgba(0,0,0,0.6);
    }
  }
</style>
