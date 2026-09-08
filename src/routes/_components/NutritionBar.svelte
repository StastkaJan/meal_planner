<script lang="ts">
  import { NUTRITION_TARGETS, nutritionProgress } from '$lib/domain/nutrition'
  import { onDestroy } from 'svelte'
  import type { DailyNutritionTargets } from '$lib/types'
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
    targets?: DailyNutritionTargets
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
    },
    {
      key: 'carbs',
      label: t('Carbs'),
      value: carbsG,
      target: targets.carbsG,
      unit: 'g',
    },
    {
      key: 'fat',
      label: t('Fat'),
      value: fatG,
      target: targets.fatG,
      unit: 'g',
    },
    {
      key: 'fiber',
      label: t('Fibre'),
      value: fiberG,
      target: targets.fiberG,
      unit: 'g',
    },
    {
      key: 'sugar',
      label: t('Sugars'),
      value: sugarG,
      target: targets.sugarG,
      unit: 'g',
    },
    {
      key: 'saturates',
      label: t('Saturates'),
      value: saturatedFatG,
      target: targets.saturatedFatG,
      unit: 'g',
    },
    {
      key: 'salt',
      label: t('Salt'),
      value: saltG,
      target: targets.saltG,
      unit: 'g',
    },
  ])

  const detailId = $props.id()
  let details: HTMLDivElement
  let active = $state<number | null>(null)
  let pinned = $state(false)
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  const selected = $derived(active === null ? null : rows[active])

  function cancelClose() {
    clearTimeout(closeTimer)
  }

  function closeDetails() {
    cancelClose()
    details?.hidePopover()
    active = null
    pinned = false
  }

  function leaveDetails() {
    cancelClose()
    if (!pinned) closeTimer = setTimeout(closeDetails, 150)
  }

  function showDetails(index: number, target: EventTarget | null, pin = false) {
    cancelClose()
    if (pin && pinned && active === index) return closeDetails()
    if (!pin && pinned) return
    active = index
    pinned = pin
    const rect = (target as Element).getBoundingClientRect()
    details.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - 105, window.innerWidth - 218))}px`
    details.style.top = `${Math.max(8, Math.min(rect.top - 110, window.innerHeight - 118))}px`
    details.showPopover()
  }

  onDestroy(cancelClose)
</script>

<svelte:window onresize={closeDetails} />

<div class="nutrition-summary">
  <div class="calories" class:over={calories > targets.calories}>
    <span class="calorie-label">{t('Calories')}</span>
    <span class="calorie-total"
      ><strong>{grams(calories)}</strong> / {targets.calories} kcal</span
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
  </div>
  <svg
    class="nutrient-pie"
    viewBox="-58 -58 116 116"
    role="group"
    aria-label={t('Nutrient goal progress')}
  >
    {#each rows as row, index}
      {@const fraction = Math.min(1, Math.max(0, row.value / row.target))}
      <g class={row.key} transform={`rotate(${(index * 360) / rows.length})`}>
        <g
          class="pie-artwork"
          transform={active === index
            ? 'translate(0.9 -1.8) scale(1.03)'
            : undefined}
        >
          <path class="pie-goal" d={sector(48)} aria-hidden="true" />
          <path
            class="pie-value"
            data-nutrient={row.key}
            data-progress={fraction}
            d={sector(48)}
            transform={`scale(${Math.sqrt(fraction)})`}
            aria-hidden="true"
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
              aria-hidden="true"
            />
          {/if}
        </g>
        <path
          class="pie-hit"
          d={sector(55)}
          role="button"
          tabindex="0"
          aria-label={row.label}
          aria-expanded={active === index}
          aria-controls={detailId}
          onpointerenter={(event) => {
            if (event.pointerType !== 'touch')
              showDetails(index, event.currentTarget)
          }}
          onpointerleave={leaveDetails}
          onfocus={(event) => showDetails(index, event.currentTarget)}
          onblur={leaveDetails}
          onclick={(event) => showDetails(index, event.currentTarget, true)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              showDetails(index, event.currentTarget, true)
            }
          }}
        />
      </g>
    {/each}
  </svg>
</div>

<div
  bind:this={details}
  id={detailId}
  class="nutrient-detail"
  role="group"
  aria-label={selected?.label}
  popover="auto"
  onpointerenter={cancelClose}
  onpointerleave={leaveDetails}
  onfocusin={cancelClose}
  onfocusout={leaveDetails}
  ontoggle={(event) => {
    if (event.newState === 'closed' && !details.matches(':popover-open')) {
      active = null
      pinned = false
    }
  }}
>
  {#if selected}
    <div
      class:over={selected.value > selected.target}
      role="meter"
      aria-label={selected.label}
      aria-valuemin="0"
      aria-valuemax={selected.target}
      aria-valuenow={Math.min(selected.value, selected.target)}
      aria-valuetext={`${grams(selected.value)} / ${selected.target} g · ${balance(selected.value, selected.target, 'g')}`}
    >
      <strong>{selected.label}</strong>
      <p>{grams(selected.value)} / {selected.target} g</p>
      <span class="balance"
        >{balance(selected.value, selected.target, 'g')}</span
      >
    </div>
    <button
      type="button"
      class="close-detail"
      aria-label={t('Close')}
      onclick={closeDetails}>×</button
    >
  {/if}
</div>

<style lang="scss">
  .nutrition-summary {
    display: grid;
    justify-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }
  .calories {
    width: 100%;
  }
  .calorie-total {
    display: block;
    color: $color-text-muted;
    font-size: 0.65rem;
    text-align: center;
  }
  .calorie-label {
    display: block;
    color: $color-text;
    font-size: 0.8rem;
    font-weight: 700;
    text-align: center;
  }
  .calorie-total strong {
    font-weight: 600;
  }
  .calorie-track {
    height: 4px;
    margin-top: 4px;
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
  .over .calorie-fill {
    background: $color-danger;
  }
  .nutrient-pie {
    display: block;
    width: 100%;
    max-width: 104px;
    overflow: visible;
  }
  .pie-artwork {
    pointer-events: none;
    transition: transform 300ms ease-in-out;
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
  .pie-hit {
    fill: transparent;
    cursor: pointer;
  }
  .pie-hit:focus-visible {
    outline: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .pie-artwork {
      transition: none;
    }
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
  .nutrient-detail {
    position: fixed;
    inset: auto;
    margin: 0;
    box-sizing: border-box;
    width: 210px;
    padding: 12px 32px 12px 12px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    box-shadow: 0 6px 20px rgb(41 39 33 / 12%);
    font-size: 0.8rem;
    p {
      margin: 6px 0;
    }
  }
  .balance {
    color: $color-text-muted;
    font-size: 0.7rem;
  }
  .over .balance {
    color: $color-danger;
  }
  .close-detail {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 28px;
    height: 28px;
    border: 0;
    background: transparent;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 1.1rem;
  }
</style>
