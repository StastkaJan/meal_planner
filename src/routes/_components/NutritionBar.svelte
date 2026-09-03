<script lang="ts">
  import {
    NUTRITION_DISPLAY_REFERENCES,
    NUTRITION_TARGETS,
    nutritionProgress,
  } from '$lib/domain/nutrition'
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

  const grams = (value: number) => Number(value.toFixed(1))

  const rows = $derived([
    {
      key: 'calories',
      label: t('Calories'),
      value: calories,
      target: targets.calories,
      unit: 'kcal',
      primary: true,
    },
    {
      key: 'protein',
      label: t('Protein'),
      value: proteinG,
      target: targets.proteinG,
      unit: 'g',
      primary: true,
    },
    {
      key: 'carbs',
      label: t('Carbs'),
      value: carbsG,
      target: targets.carbsG,
      unit: 'g',
      primary: true,
    },
    {
      key: 'fat',
      label: t('Fat'),
      value: fatG,
      target: targets.fatG,
      unit: 'g',
      primary: true,
    },
    {
      key: 'fiber',
      label: t('Fibre'),
      value: fiberG,
      target: NUTRITION_DISPLAY_REFERENCES.fiberG,
      unit: 'g',
      primary: false,
    },
    {
      key: 'sugar',
      label: t('Sugars'),
      value: sugarG,
      target: NUTRITION_DISPLAY_REFERENCES.sugarG,
      unit: 'g',
      primary: false,
    },
    {
      key: 'saturates',
      label: t('Saturates'),
      value: saturatedFatG,
      target: NUTRITION_DISPLAY_REFERENCES.saturatedFatG,
      unit: 'g',
      primary: false,
    },
    {
      key: 'salt',
      label: t('Salt'),
      value: saltG,
      target: NUTRITION_DISPLAY_REFERENCES.saltG,
      unit: 'g',
      primary: false,
    },
  ])
</script>

<div class="bar-col">
  {#each rows as row}
    {@const progress = nutritionProgress(row.value, row.target)}
    <div
      class="bar-row"
      class:secondary={!row.primary}
      class:over={progress.wayOver}
      title={`${row.label}: ${grams(row.value)}${row.unit} / ${row.target}${row.unit}`}
    >
      {#if !row.primary}
        <span class="nutrient">{row.key === 'saturates' ? '' : row.label}</span>
      {/if}
      <div class="track">
        <div class="fill {row.key}" style="width:{progress.percent}%"></div>
      </div>
      <span class="val"
        >{grams(row.value)}{row.primary && row.key === 'calories'
          ? ''
          : 'g'}</span
      >
    </div>
  {/each}
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
  .bar-row.secondary {
    gap: 3px;
    margin-top: 1px;
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
    &.fiber {
      background: #8b5cf6;
    }
    &.sugar {
      background: #eab308;
    }
    &.saturates {
      background: #f97316;
    }
    &.salt {
      background: #64748b;
    }
  }
  .bar-row.over {
    .fill {
      background: $color-danger;
    }
    .track {
      box-shadow: 0 0 0 1px rgb(184 59 50 / 35%);
    }
    .val {
      color: $color-danger;
      font-weight: 750;
    }
  }
  .val {
    font-size: 0.65rem;
    color: $color-text-muted;
    min-width: 24px;
    text-align: right;
  }
  .nutrient {
    width: 36px;
    overflow: hidden;
    color: $color-text-muted;
    font-size: 0.58rem;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
