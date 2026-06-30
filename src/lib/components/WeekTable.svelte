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

<div class="table-wrap">
  <div class="grid">
    <div class="header-cell row-label"></div>
    {#each DAYS as d}
      <div class="header-cell">{DAY_NAMES[d]}</div>
    {/each}

    {#each MEAL_TYPES as mt}
      <div class="row-label">{mt}</div>
      {#each DAYS as d}
        <MealCell
          slot={slotMap.get(`${d}-${mt}`) ?? null}
          {meals}
          mealType={mt}
          onPick={(mealId) => onSlotChange(d, mt, mealId)}
        />
      {/each}
    {/each}

    <div class="row-label nutrition-label">nutrition</div>
    {#each dailyNutrition as dn}
      <NutritionBar {...dn} />
    {/each}

    {#if onAutoCompose}
      <div class="foot-actions">
        <button class="btn-autocompose" onclick={onAutoCompose}>Auto-compose</button>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .table-wrap {
    overflow-x: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: 90px repeat(7, 1fr);
    gap: 4px;
    min-width: 700px;
  }
  .header-cell {
    padding: 8px 4px;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .row-label {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    color: $color-text-muted;
    text-transform: capitalize;
  }
  .nutrition-label {
    font-size: 0.7rem;
  }
  .foot-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    padding: 4px 0;
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
