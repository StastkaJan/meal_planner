<script lang="ts">
  import { NUTRITION_TARGETS } from '$lib/types';

  let { calories, proteinG, carbsG, fatG }: {
    calories: number;
    proteinG: number;
    carbsG:   number;
    fatG:     number;
  } = $props();

  const pct = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));
</script>

<div class="bar-col">
  <div class="bar-row" title="Calories: {calories} / {NUTRITION_TARGETS.calories} kcal">
    <div class="track">
      <div class="fill calories" style="width:{pct(calories, NUTRITION_TARGETS.calories)}%"></div>
    </div>
    <span class="val">{calories}</span>
  </div>
  <div class="bar-row" title="Protein: {proteinG}g / {NUTRITION_TARGETS.proteinG}g">
    <div class="track">
      <div class="fill protein" style="width:{pct(proteinG, NUTRITION_TARGETS.proteinG)}%"></div>
    </div>
  </div>
  <div class="bar-row" title="Carbs: {carbsG}g / {NUTRITION_TARGETS.carbsG}g">
    <div class="track">
      <div class="fill carbs" style="width:{pct(carbsG, NUTRITION_TARGETS.carbsG)}%"></div>
    </div>
  </div>
  <div class="bar-row" title="Fat: {fatG}g / {NUTRITION_TARGETS.fatG}g">
    <div class="track">
      <div class="fill fat" style="width:{pct(fatG, NUTRITION_TARGETS.fatG)}%"></div>
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
    &.calories { background: #f59e0b; }
    &.protein  { background: #3b82f6; }
    &.carbs    { background: #22c55e; }
    &.fat      { background: #ec4899; }
  }
  .val {
    font-size: 0.65rem;
    color: $color-text-muted;
    min-width: 24px;
    text-align: right;
  }
</style>
