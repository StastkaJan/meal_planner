<script lang="ts">
  import { NUTRITION_TARGETS } from '$lib/domain/nutrition'
  import type { NutritionTargets } from '$lib/types'
  import { useI18n } from '$lib/i18n-context'

  const { t } = useI18n()

  let {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sugarG,
    saturatedFatG,
    saltG,
    targets = NUTRITION_TARGETS,
  }: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    fiberG: number
    sugarG: number
    saturatedFatG: number
    saltG: number
    targets?: NutritionTargets
  } = $props()

  const pct = (v: number, max: number) =>
    Math.min(100, Math.round((v / max) * 100))
  const grams = (value: number) => Number(value.toFixed(1))
</script>

<div class="bar-col">
  <div
    class="bar-row"
    title={t('Calories: {value} / {target} kcal', {
      value: calories,
      target: targets.calories,
    })}
  >
    <div class="track">
      <div
        class="fill calories"
        style="width:{pct(calories, targets.calories)}%"
      ></div>
    </div>
    <span class="val">{calories}</span>
  </div>
  <div
    class="bar-row"
    title={t('Protein: {value}g / {target}g', {
      value: proteinG,
      target: targets.proteinG,
    })}
  >
    <div class="track">
      <div
        class="fill protein"
        style="width:{pct(proteinG, targets.proteinG)}%"
      ></div>
    </div>
  </div>
  <div
    class="bar-row"
    title={t('Carbs: {value}g / {target}g', {
      value: carbsG,
      target: targets.carbsG,
    })}
  >
    <div class="track">
      <div
        class="fill carbs"
        style="width:{pct(carbsG, targets.carbsG)}%"
      ></div>
    </div>
  </div>
  <div
    class="bar-row"
    title={t('Fat: {value}g / {target}g', {
      value: fatG,
      target: targets.fatG,
    })}
  >
    <div class="track">
      <div class="fill fat" style="width:{pct(fatG, targets.fatG)}%"></div>
    </div>
  </div>
  <div class="secondary">
    <span title={t('Fibre: {value}g', { value: grams(fiberG) })}
      >{t('Fibre')} {grams(fiberG)}</span
    >
    <span title={t('Sugars: {value}g', { value: grams(sugarG) })}
      >{t('Sugars')} {grams(sugarG)}</span
    >
    <span
      title={t('Saturated fat: {value}g', {
        value: grams(saturatedFatG),
      })}>{t('Saturates')} {grams(saturatedFatG)}</span
    >
    <span title={t('Salt: {value}g', { value: grams(saltG) })}
      >{t('Salt')} {grams(saltG)}</span
    >
  </div>
</div>

<style lang="scss">
  .bar-col {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 2px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .track {
    flex: 1;
    height: 4px;
    background: #e7e1d6;
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
  .secondary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 6px;
    margin-top: 1px;
    color: $color-text-muted;
    font-size: 0.58rem;
    line-height: 1.2;
  }
</style>
