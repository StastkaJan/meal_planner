<script lang="ts">
  import { NUTRITION_TARGETS } from '$lib/types'
  import type { NutritionTargets } from '$lib/types'

  let {
    calories,
    proteinG,
    carbsG,
    fatG,
    targets = NUTRITION_TARGETS,
  }: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    targets?: NutritionTargets
  } = $props()

  const pct = (v: number, max: number) =>
    Math.min(100, Math.round((v / max) * 100))
</script>

<div class="bar-col">
  <div class="bar-row" title="Calories: {calories} / {targets.calories} kcal">
    <div class="track">
      <div
        class="fill calories"
        style="width:{pct(calories, targets.calories)}%"
      ></div>
    </div>
    <span class="val">{calories}</span>
  </div>
  <div class="bar-row" title="Protein: {proteinG}g / {targets.proteinG}g">
    <div class="track">
      <div
        class="fill protein"
        style="width:{pct(proteinG, targets.proteinG)}%"
      ></div>
    </div>
  </div>
  <div class="bar-row" title="Carbs: {carbsG}g / {targets.carbsG}g">
    <div class="track">
      <div
        class="fill carbs"
        style="width:{pct(carbsG, targets.carbsG)}%"
      ></div>
    </div>
  </div>
  <div class="bar-row" title="Fat: {fatG}g / {targets.fatG}g">
    <div class="track">
      <div class="fill fat" style="width:{pct(fatG, targets.fatG)}%"></div>
    </div>
  </div>
</div>

<style lang="scss">
  .bar-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .track {
    flex: 1;
    height: 5px;
    background: $color-surface-2;
    border-radius: 3px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;
    &.calories {
      background: #f59e0b;
    }
    &.protein {
      background: #3b82f6;
    }
    &.carbs {
      background: #22c55e;
    }
    &.fat {
      background: #ec4899;
    }
  }
  .val {
    font-size: 0.65rem;
    color: $color-text-muted;
    min-width: 24px;
    text-align: right;
  }
</style>
