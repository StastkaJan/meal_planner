<script lang="ts">
  import type { SlotWithMeal } from '$lib/types'
  import { useI18n } from '$lib/i18n-context'
  import { localeCode } from '$lib/i18n'

  const { t, label, locale } = useI18n()

  let {
    slot,
    onOpenPicker,
    mealType,
    leftoverSource,
    onPick,
    onLeftover,
  }: {
    slot: SlotWithMeal | null
    onOpenPicker: () => void
    mealType: string
    leftoverSource: SlotWithMeal | null
    onPick: (mealId: number | null) => void
    onLeftover: (source: { date: string; mealType: string } | null) => void
  } = $props()

  const usesLeftovers = $derived(slot?.leftoverSourceDate != null)
  const sourceLabel = $derived(
    leftoverSource
      ? `${new Date(`${leftoverSource.date}T00:00:00Z`).toLocaleDateString(
          localeCode(locale()),
          { dateStyle: 'medium', timeZone: 'UTC' },
        )} ${label(leftoverSource.mealType)}`
      : '',
  )
</script>

{#if slot?.mealName}
  <div class="cell {mealType}">
    <button
      type="button"
      class="meal-info"
      onclick={onOpenPicker}
      title={t('Edit meal assignment')}
      aria-label={t('Edit meal assignment')}
    >
      <span class="name">{slot.mealName}</span>
      {#if slot.calories}
        <span class="kcal">{slot.calories} kcal</span>
      {/if}
      {#if usesLeftovers}
        <span class="leftover-label">{t('leftovers')}</span>
      {/if}
    </button>
    <div class="actions">
      <a
        href="/meals/{slot.mealId}"
        title={t('Show recipe')}
        aria-label={t('Show recipe')}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M7 4h9v9M16 4 8 12M13 10v5H4V6h5" />
        </svg></a
      >
      {#if leftoverSource || usesLeftovers}
        <button
          type="button"
          class:active={usesLeftovers}
          onclick={() =>
            onLeftover(
              usesLeftovers || !leftoverSource
                ? null
                : {
                    date: leftoverSource.date,
                    mealType: leftoverSource.mealType,
                  },
            )}
          title={usesLeftovers
            ? t('Prepare separately')
            : t('Use leftovers from {source}', { source: sourceLabel })}
          aria-label={usesLeftovers
            ? t('Prepare separately')
            : t('Use leftovers from {source}', { source: sourceLabel })}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 6 3 10l4 4M4 10h7a5 5 0 0 1 5 5" />
          </svg></button
        >
      {/if}
      <button
        type="button"
        onclick={() => onPick(null)}
        title={t('Remove meal')}
        aria-label={t('Remove meal')}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m6 6 8 8m0-8-8 8" />
        </svg></button
      >
    </div>
  </div>
{:else}
  <button
    class="cell {mealType}"
    onclick={onOpenPicker}
    title={t('Click to assign meal')}
  >
    <span class="empty">—</span>
  </button>
{/if}

<style lang="scss">
  .cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    height: 100%;
    min-height: 72px;
    padding: 10px;
    background: transparent;
    border: none;
    border-left: 3px solid transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;

    &:hover {
      background: #faf8f2;
    }

    &.breakfast {
      border-left-color: $color-breakfast;
    }
    &.morning_snack {
      border-left-color: $color-morning_snack;
    }
    &.lunch {
      border-left-color: $color-lunch;
    }
    &.afternoon_snack {
      border-left-color: $color-afternoon_snack;
    }
    &.dinner {
      border-left-color: $color-dinner;
    }
  }
  .meal-info {
    display: flex;
    flex: 1;
    width: 100%;
    flex-direction: column;
    gap: 2px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }
  .actions {
    display: flex;
    gap: 2px;

    button,
    a {
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      place-items: center;
      border: 0;
      border-radius: $radius-sm;
      background: transparent;
      color: $color-text-muted;
      cursor: pointer;
      font-size: 0.9rem;
      line-height: 1;
      text-decoration: none;

      &:hover {
        background: $color-surface-2;
        color: $color-text;
      }

      svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }
    }
  }
  .name {
    font-size: 0.82rem;
    font-weight: 600;
    color: $color-text;
    line-height: 1.3;
  }
  .kcal {
    font-size: 0.7rem;
    color: $color-text-muted;
  }
  .leftover-label {
    color: $color-accent;
    font-size: 0.66rem;
    font-weight: 650;
  }
  .actions button.active {
    background: $color-accent-dim;
    color: $color-accent;
  }
  @media (hover: hover) {
    .actions {
      opacity: 0;
      transform: translateY(3px);
      transition:
        opacity 0.15s,
        transform 0.15s;
    }
    .cell:hover .actions,
    .cell:focus-within .actions {
      opacity: 1;
      transform: none;
    }
  }
  .empty {
    font-size: 0.8rem;
    color: $color-text-muted;
    opacity: 0.45;
  }
  :global(.meal-dialog) {
    padding: 0;
    max-width: 420px;
    width: 90vw;
  }
</style>
