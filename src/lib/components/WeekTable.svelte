<script lang="ts">
  import type { SlotWithMeal, MealType, PlanDetail } from '$lib/types';
  import { DAYS, DAY_NAMES, MEAL_TYPES } from '$lib/types';
  import type { Meal } from '$lib/schema';
  import MealCell from './MealCell.svelte';
  import NutritionBar from './NutritionBar.svelte';

  let { plan, meals, onSlotChange, onAutoCompose }: {
    plan: PlanDetail;
    meals: Meal[];
    onSlotChange: (day: number, mealType: string, mealId: number | null) => void;
    onAutoCompose?: () => void;
  } = $props();

  const slotMap = $derived(
    new Map(plan.slots.map(s => [`${s.dayOfWeek}-${s.mealType}`, s]))
  );

  const dailyNutrition = $derived(
    DAYS.map(d => {
      const daySlots = plan.slots.filter(s => s.dayOfWeek === d);
      return {
        calories: daySlots.reduce((sum, s) => sum + (s.calories ?? 0), 0),
        proteinG: daySlots.reduce((sum, s) => sum + parseFloat(s.proteinG ?? '0'), 0),
        carbsG:   daySlots.reduce((sum, s) => sum + parseFloat(s.carbsG   ?? '0'), 0),
        fatG:     daySlots.reduce((sum, s) => sum + parseFloat(s.fatG     ?? '0'), 0),
      };
    })
  );
</script>

<div class="cal-wrap">
  <table class="cal">
    <thead>
      <tr>
        <th class="corner"></th>
        {#each DAYS as d}
          <th class="day-head">{DAY_NAMES[d]}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each MEAL_TYPES as mt}
        <tr>
          <td class="row-label">{mt.replaceAll('_', ' ')}</td>
          {#each DAYS as d}
            <td class="slot-cell">
              <MealCell
                slot={slotMap.get(`${d}-${mt}`) ?? null}
                {meals}
                mealType={mt}
                onPick={(mealId) => onSlotChange(d, mt, mealId)}
              />
            </td>
          {/each}
        </tr>
      {/each}
      <tr class="nutrition-row">
        <td class="row-label nutrition-label">nutrition</td>
        {#each dailyNutrition as dn}
          <td class="slot-cell nutrition-cell">
            <NutritionBar {...dn} />
          </td>
        {/each}
      </tr>
    </tbody>
  </table>

  {#if onAutoCompose}
    <div class="foot-actions">
      <button class="btn-autocompose" onclick={onAutoCompose}>Auto-compose</button>
    </div>
  {/if}
</div>

<style lang="scss">
  .cal-wrap {
    overflow-x: auto;
    border: 1px solid $color-border;
    border-radius: $radius;
    overflow: hidden;
  }

  .cal {
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .corner {
    width: 90px;
  }

  thead {
    background: $color-surface;
    border-bottom: 2px solid $color-border;
  }

  .day-head {
    padding: 10px 6px;
    text-align: center;
    font-size: 0.78rem;
    font-weight: 700;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-left: 1px solid $color-border;
  }

  .row-label {
    padding: 0 10px;
    font-size: 0.72rem;
    font-weight: 600;
    color: $color-text-muted;
    text-transform: capitalize;
    white-space: nowrap;
    border-top: 1px solid $color-border;
    background: $color-surface;
    vertical-align: middle;
  }

  .nutrition-label {
    font-size: 0.68rem;
    color: $color-text-muted;
  }

  .slot-cell {
    border-top: 1px solid $color-border;
    border-left: 1px solid $color-border;
    padding: 0;
    vertical-align: top;
  }

  .nutrition-row {
    background: $color-surface;
  }

  .nutrition-cell {
    padding: 6px 8px;
    vertical-align: middle;
  }

  .foot-actions {
    display: flex;
    justify-content: flex-end;
    padding: 8px 0 0;
  }

  .btn-autocompose {
    padding: 4px 12px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 500;
    opacity: 0.85;
    &:hover { opacity: 1; }
  }
</style>
