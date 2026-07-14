<script lang="ts">
  import type { SlotWithMeal } from '$lib/types'
  import type { Meal } from '$lib/schema'
  import MealCell from './MealCell.svelte'

  let {
    date,
    slots,
    meals,
    onPick,
  }: {
    date: string
    slots: SlotWithMeal[]
    meals: Meal[]
    onPick: (time: string, mealId: number | null) => void
  } = $props()

  let newTime = $state('')

  const daySlots = $derived(
    slots
      .filter((s) => s.date === date)
      .sort((a, b) => a.mealType.localeCompare(b.mealType)),
  )

  function addSlot(mealId: number | null) {
    if (!newTime || mealId === null) return
    onPick(newTime, mealId)
    newTime = ''
  }
</script>

<div class="timeline">
  {#each daySlots as slot (slot.mealType)}
    <div class="timed-slot">
      <span class="time-label">{slot.mealType}</span>
      <MealCell
        {slot}
        {meals}
        mealType={slot.mealType}
        onPick={(mealId) => onPick(slot.mealType, mealId)}
      />
    </div>
  {/each}

  <div class="add-slot">
    <input type="time" bind:value={newTime} aria-label="New meal time" />
    {#if newTime}
      <MealCell slot={null} {meals} mealType={newTime} onPick={addSlot} />
    {/if}
  </div>
</div>

<style lang="scss">
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
  }

  .timed-slot {
    display: flex;
    flex-direction: column;
  }

  .time-label {
    font-size: 0.65rem;
    color: $color-text-muted;
    padding: 2px 6px 0;
  }

  .add-slot {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 4px;

    input[type='time'] {
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 3px 6px;
      color: $color-text;
      font-size: 0.75rem;
    }
  }
</style>
