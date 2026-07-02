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

  const weekDates = $derived(
    DAYS.map(d => {
      const dt = new Date(plan.weekStart + 'T00:00:00');
      dt.setDate(dt.getDate() + d);
      return dt;
    })
  );

  const monthLabel = $derived(
    weekDates[0].getMonth() === weekDates[6].getMonth()
      ? weekDates[0].toLocaleDateString('en', { month: 'long', year: 'numeric' })
      : `${weekDates[0].toLocaleDateString('en', { month: 'short' })} – ${weekDates[6].toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
  );

  const todayStr = new Date().toDateString();

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
        <th class="corner"><span class="month-label">{monthLabel}</span></th>
        {#each DAYS as d}
          <th class="day-head" class:today={weekDates[d].toDateString() === todayStr}>
            <span class="day-name">{DAY_NAMES[d]}</span>
            <span class="day-num">{weekDates[d].getDate()}</span>
          </th>
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

  .month-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: $color-text-muted;
    text-transform: none;
    letter-spacing: 0;
  }

  thead {
    background: $color-surface;
    border-bottom: 2px solid $color-border;
  }

  .day-head {
    padding: 8px 6px;
    text-align: center;
    border-left: 1px solid $color-border;

    .day-name {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      color: $color-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .day-num {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      color: $color-text;
      line-height: 1.4;
    }

    &.today {
      .day-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: $color-accent;
        color: #fff;
        border-radius: 50%;
        font-size: 0.9rem;
      }
    }
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
