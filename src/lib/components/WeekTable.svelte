<script lang="ts">
  import type { SlotWithMeal, MealType, PlanDetail } from '$lib/types';
  import { DAYS, DAY_NAMES, MEAL_TYPES } from '$lib/types';
  import type { Meal } from '$lib/schema';
  import MealCell from './MealCell.svelte';
  import NutritionBar from './NutritionBar.svelte';

  let { plan, meals, weekStart, onSlotChange, onAutoCompose, onPrevWeek, onNextWeek }: {
    plan: PlanDetail;
    meals: Meal[];
    weekStart: string;
    onSlotChange: (day: number, mealType: string, mealId: number | null) => void;
    onAutoCompose?: () => void;
    onPrevWeek: () => void;
    onNextWeek: () => void;
  } = $props();

  const slotMap = $derived(
    new Map(plan.slots.map(s => [`${s.dayOfWeek}-${s.mealType}`, s]))
  );

  const weekDates = $derived(
    DAYS.map(d => {
      const dt = new Date(weekStart); // UTC midnight
      dt.setUTCDate(dt.getUTCDate() + d);
      return dt;
    })
  );

  const monthLabel = $derived(
    weekDates[0].getUTCMonth() === weekDates[6].getUTCMonth()
      ? weekDates[0].toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      : `${weekDates[0].toLocaleDateString('en', { month: 'short', timeZone: 'UTC' })} – ${weekDates[6].toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`
  );

  const todayUTC = new Date().toISOString().slice(0, 10);

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
  <div class="cal-scroll">
  <table class="cal">
    <thead>
      <tr>
        <th class="corner">
          <div class="week-nav">
            <button class="nav-btn" onclick={onPrevWeek} aria-label="Previous week">‹</button>
            <span class="month-label">{monthLabel}</span>
            <button class="nav-btn" onclick={onNextWeek} aria-label="Next week">›</button>
          </div>
        </th>
        {#each DAYS as d}
          <th class="day-head" class:today={weekDates[d].toISOString().slice(0, 10) === todayUTC}>
            <span class="day-name">{DAY_NAMES[d]}</span>
            <span class="day-num">{weekDates[d].getUTCDate()}</span>
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
  </div>

  {#if onAutoCompose}
    <div class="foot-actions">
      <button class="btn-autocompose" onclick={onAutoCompose}>Auto-compose</button>
    </div>
  {/if}
</div>

<style lang="scss">
  .cal-wrap {
    border: 1px solid $color-border;
    border-radius: $radius;
    overflow: hidden;
  }

  .cal-scroll {
    overflow-x: auto;
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

  .week-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    padding: 0 4px;
  }

  .nav-btn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 2px 4px;
    border-radius: $radius-sm;
    &:hover { color: $color-text; background: $color-surface-2; }
  }

  .month-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: $color-text-muted;
    text-align: center;
    text-transform: none;
    letter-spacing: 0;
    flex: 1;
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
