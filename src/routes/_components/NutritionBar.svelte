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
  const calorieProgress = $derived(
    nutritionProgress(calories, targets.calories),
  )

  function balance(value: number, target: number, unit: string) {
    return t(
      value > target
        ? '{value} {unit} over target'
        : '{value} {unit} remaining',
      {
        value: grams(Math.abs(target - value)),
        unit,
      },
    )
  }

  // Equal sectors compare independent goals, not shares of a nutrient total.
  function sector(radius: number) {
    const angle = (2 * Math.PI) / 7
    return `M 0 0 L 0 ${-radius} A ${radius} ${radius} 0 0 1 ${radius * Math.sin(angle)} ${-radius * Math.cos(angle)} Z`
  }

  const rows = $derived([
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

{#snippet nutrient(row: (typeof rows)[number])}
  {@const status = row.primary
    ? balance(row.value, row.target, row.unit)
    : t(
        row.value > row.target
          ? '{value} g above reference'
          : '{value} g below reference',
        {
          value: grams(Math.abs(row.target - row.value)),
        },
      )}
  <div
    class="nutrient {row.key}"
    class:over={row.value > row.target}
    role="meter"
    aria-label={row.label}
    aria-valuemin="0"
    aria-valuemax={row.target}
    aria-valuenow={Math.min(row.value, row.target)}
    aria-valuetext={`${grams(row.value)} / ${row.target} g · ${status}`}
  >
    <span class="swatch" aria-hidden="true"></span>
    <div class="nutrient-copy">
      <span class="nutrient-label">{row.label}</span>
      <span class="amount"
        ><strong>{grams(row.value)}</strong> / {row.target} g</span
      >
      <span class="balance">{status}</span>
    </div>
  </div>
{/snippet}

<div class="nutrition-summary">
  <div class="calories" class:over={calorieProgress.wayOver}>
    <span class="nutrient-label">{t('Calories')}</span>
    <div class="calorie-total">
      <strong>{grams(calories)}</strong> <span>kcal</span>
    </div>
    <span class="target"
      >{t('Target: {value} kcal', { value: targets.calories })}</span
    >
    <div
      class="calorie-track"
      role="meter"
      aria-label={t('Calories')}
      aria-valuemin="0"
      aria-valuemax={targets.calories}
      aria-valuenow={Math.min(calories, targets.calories)}
      aria-valuetext={`${t('Calories: {value} / {target} kcal', { value: grams(calories), target: targets.calories })} · ${balance(calories, targets.calories, 'kcal')}`}
    >
      <div
        class="calorie-fill"
        style:width={`${calorieProgress.percent}%`}
      ></div>
    </div>
    <span class="balance">{balance(calories, targets.calories, 'kcal')}</span>
  </div>
  <svg
    class="nutrient-pie"
    viewBox="-58 -58 116 116"
    role="img"
    aria-label={t('Nutrient goal progress')}
  >
    <title
      >{t(
        'Pale slices show goals; solid color shows planned amounts. Red edges mark excess.',
      )}</title
    >
    {#each rows as row, index}
      {@const fraction = Math.min(1, Math.max(0, row.value / row.target))}
      <g
        class={row.key}
        transform={`rotate(${(index * 360) / rows.length})`}
        aria-hidden="true"
      >
        <path class="pie-goal" d={sector(48)} />
        <path
          class="pie-value"
          data-nutrient={row.key}
          data-progress={fraction}
          d={sector(48)}
          transform={`scale(${Math.sqrt(fraction)})`}
        />
        {#if row.value > row.target}
          <circle
            class="pie-overflow"
            data-nutrient={row.key}
            cx="0"
            cy="0"
            r="53"
            pathLength="360"
            stroke-dasharray={`${360 / rows.length - 4} 360`}
            transform="rotate(-88)"
          />
        {/if}
      </g>
    {/each}
  </svg>
  <p class="chart-key">
    {t('Pale = goal · Solid = planned · Red edge = over')}
  </p>
  <div class="nutrient-legend">
    {#each rows.filter((row) => row.primary) as row}
      {@render nutrient(row)}
    {/each}
    <p class="reference-note">{t('Daily reference amounts')}</p>
    {#each rows.filter((row) => !row.primary) as row}
      {@render nutrient(row)}
    {/each}
  </div>
</div>

<style lang="scss">
  .nutrition-summary,
  .nutrient-legend {
    display: grid;
    gap: 12px;
    font-variant-numeric: tabular-nums;
  }
  .nutrient {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }
  .nutrient-copy,
  .calories {
    display: grid;
    gap: 2px;
  }
  .nutrient-label {
    color: $color-text;
    font-size: 0.7rem;
    font-weight: 650;
  }
  .amount,
  .target,
  .calorie-total span {
    color: $color-text-muted;
    font-size: 0.7rem;
  }
  .amount strong {
    color: $color-text;
  }
  .balance,
  .reference-note {
    color: $color-text-muted;
    font-size: 0.65rem;
    line-height: 1.4;
  }
  .calorie-total {
    line-height: 1.2;
  }
  .calorie-total strong {
    font-size: 1.45rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }
  .calorie-track {
    height: 8px;
    margin: 5px 0;
    border-radius: 999px;
    background: $color-surface-2;
    overflow: hidden;
  }
  .calorie-fill {
    height: 100%;
    border-radius: inherit;
    background: #b56b12;
    transition: width 0.3s;
  }
  .nutrient-pie {
    display: block;
    width: 100%;
    max-width: 180px;
    margin: 0 auto;
  }
  .pie-goal {
    fill: currentColor;
    fill-opacity: 0.2;
    stroke: $color-surface;
    stroke-width: 1;
  }
  .pie-value {
    fill: currentColor;
    stroke: $color-surface;
    stroke-width: 1;
  }
  .pie-overflow {
    fill: none;
    stroke: $color-danger;
    stroke-width: 4;
    stroke-linecap: round;
  }
  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: currentColor;
  }
  .chart-key {
    margin: 0;
    color: $color-text-muted;
    font-size: 0.65rem;
    line-height: 1.4;
  }
  .protein {
    color: #4f6f8f;
  }
  .carbs {
    color: #4d7c5a;
  }
  .fat {
    color: #be5d7a;
  }
  .fiber {
    color: #8266a3;
  }
  .sugar {
    color: #9b7b16;
  }
  .saturates {
    color: #b86d37;
  }
  .salt {
    color: #64748b;
  }
  .over .calorie-fill {
    background: $color-danger;
  }
  .over .balance {
    color: $color-danger;
  }
  .reference-note {
    margin: 0;
    border-top: 1px solid $color-border;
    padding-top: 8px;
  }
</style>
