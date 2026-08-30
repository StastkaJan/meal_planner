<script lang="ts">
  import type { SlotRepeat } from '$lib/database/schema'
  import ChoiceChips from '$lib/components/ui/ChoiceChips.svelte'
  import { CUISINE_OPTIONS, DIET_OPTIONS, MEAL_TYPES } from '$lib/constants'
  import { normalizeMealSlot } from '$lib/domain/meal-slots'
  import { useI18n } from '$lib/i18n-context'

  const { t, label, locale } = useI18n()

  let {
    plan,
    preferences,
    isPro,
    favoritesOnly = $bindable(false),
    myRecipesOnly = $bindable(false),
    onPreferenceChange,
    onMealSlotsChange,
    onRepeatChange,
  }: {
    plan: {
      mealSlots: string[]
      slotRepeats?: Pick<SlotRepeat, 'mealType' | 'groupBreaks'>[]
    }
    preferences: {
      cuisinePrefs: string[]
      dietaryRestrictions: string[]
    }
    isPro: boolean
    favoritesOnly?: boolean
    myRecipesOnly?: boolean
    onPreferenceChange: (patch: {
      cuisinePrefs?: string[]
      dietaryRestrictions?: string[]
    }) => void
    onMealSlotsChange: (mealSlots: string[]) => void
    onRepeatChange?: (mealType: string, groupBreaks: boolean[]) => void
  } = $props()

  const dayLabels = $derived(
    locale() === 'cs'
      ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  )
  // no saved row = every day independent, same as all gaps split
  const NO_GROUPING = [true, true, true, true, true, true]
  const customSlots = $derived(
    plan.mealSlots.filter(
      (slot) => !(MEAL_TYPES as readonly string[]).includes(slot),
    ),
  )

  function toggleSlot(mealType: string, enabled: boolean) {
    const mealSlots = enabled
      ? [
          ...MEAL_TYPES.filter(
            (slot) => slot === mealType || plan.mealSlots.includes(slot),
          ),
          ...customSlots,
        ]
      : plan.mealSlots.filter((slot) => slot !== mealType)
    if (mealSlots.length) onMealSlotsChange(mealSlots)
  }

  function addCustomSlot(event: SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const mealType = normalizeMealSlot(
      String(new FormData(form).get('customSlot') ?? ''),
    )
    if (
      mealType &&
      !plan.mealSlots.includes(mealType) &&
      plan.mealSlots.length < 10
    ) {
      onMealSlotsChange([...plan.mealSlots, mealType])
      form.reset()
    }
  }

  function breaksFor(mealType: string): boolean[] {
    return (
      plan.slotRepeats?.find((r) => r.mealType === mealType)?.groupBreaks ??
      NO_GROUPING
    )
  }

  function toggleGap(mealType: string, gapIdx: number) {
    const breaks = [...breaksFor(mealType)]
    breaks[gapIdx] = !breaks[gapIdx]
    onRepeatChange?.(mealType, breaks)
  }
</script>

<details class="settings">
  <summary>{t('Plan settings')}</summary>
  <div class="body">
    <section>
      <h4>
        {t('Cuisine preferences')}
        <button
          type="button"
          class="help"
          tabindex="0"
          title={t('Used by auto-compose to prefer matching recipes.')}
          aria-label={t('Used by auto-compose to prefer matching recipes.')}
          >?</button
        >
      </h4>
      <ChoiceChips
        options={CUISINE_OPTIONS}
        selected={preferences.cuisinePrefs}
        format={label}
        onChange={(cuisinePrefs) => onPreferenceChange({ cuisinePrefs })}
      />
    </section>
    <section>
      <h4>
        {t('Dietary restrictions')}
        <button
          type="button"
          class="help"
          tabindex="0"
          title={t('Auto-compose excludes recipes that do not match.')}
          aria-label={t('Auto-compose excludes recipes that do not match.')}
          >?</button
        >
      </h4>
      <ChoiceChips
        options={DIET_OPTIONS}
        selected={preferences.dietaryRestrictions}
        format={label}
        onChange={(dietaryRestrictions) =>
          onPreferenceChange({ dietaryRestrictions })}
      />
    </section>
    <section>
      <h4>
        {t('Auto-compose')}
        <button
          type="button"
          class="help"
          tabindex="0"
          title={t(
            'Limit automatic planning by favourites or recipe ownership.',
          )}
          aria-label={t(
            'Limit automatic planning by favourites or recipe ownership.',
          )}>?</button
        >
      </h4>
      <label class="favorites-only">
        <input type="checkbox" disabled={!isPro} bind:checked={favoritesOnly} />
        {t('Favourites only')}
      </label>
      <label class="favorites-only">
        <input type="checkbox" disabled={!isPro} bind:checked={myRecipesOnly} />
        {t('My recipes only')}
      </label>
    </section>
    <section>
      <h4>
        {t('Meal slots')}
        <button
          type="button"
          class="help"
          tabindex="0"
          title={t('Choose which meals appear on every day of the plan.')}
          aria-label={t('Choose which meals appear on every day of the plan.')}
          >?</button
        >
      </h4>
      <p class="hint">
        {t('Disabled slots and their planned meals are removed.')}
      </p>
      <div class="slot-options">
        {#each MEAL_TYPES as mealType}
          <label>
            <input
              type="checkbox"
              checked={plan.mealSlots.includes(mealType)}
              disabled={plan.mealSlots.length === 1 &&
                plan.mealSlots.includes(mealType)}
              onchange={(event) =>
                toggleSlot(mealType, event.currentTarget.checked)}
            />
            {label(mealType)}
          </label>
        {/each}
      </div>
      {#if customSlots.length}
        <div class="custom-slots">
          {#each customSlots as mealType}
            <span>
              {label(mealType)}
              <button
                type="button"
                disabled={plan.mealSlots.length === 1}
                aria-label={t('Remove {name}', { name: label(mealType) })}
                onclick={() =>
                  onMealSlotsChange(
                    plan.mealSlots.filter((slot) => slot !== mealType),
                  )}>x</button
              >
            </span>
          {/each}
        </div>
      {/if}
      <form class="custom-slot-form" onsubmit={addCustomSlot}>
        <input
          name="customSlot"
          maxlength="40"
          placeholder={t('Custom slot name')}
          aria-label={t('Custom slot name')}
          required
        />
        <button type="submit" disabled={plan.mealSlots.length >= 10}
          >{t('Add slot')}</button
        >
      </form>
    </section>
    {#if onRepeatChange}
      <section>
        <h4>
          {t('Repeat pattern')}
          <button
            type="button"
            class="help"
            tabindex="0"
            title={t('Join neighbouring days that should use the same recipe.')}
            aria-label={t(
              'Join neighbouring days that should use the same recipe.',
            )}>?</button
          >
        </h4>
        {#each plan.mealSlots as mealType}
          {@const breaks = breaksFor(mealType)}
          <div class="repeat-row">
            <span class="mt-label">{label(mealType)}</span>
            <div class="days">
              {#each dayLabels as day, i}
                <span class="day">{day}</span>
                {#if i < 6}
                  <button
                    type="button"
                    class="gap"
                    class:joined={!breaks[i]}
                    title={breaks[i] ? t('Different meal') : t('Same meal')}
                    aria-label={t(
                      '{meal}: {day1} and {day2} use the same meal',
                      {
                        meal: label(mealType),
                        day1: day,
                        day2: dayLabels[i + 1],
                      },
                    )}
                    aria-pressed={!breaks[i]}
                    onclick={() => toggleGap(mealType, i)}
                  ></button>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </section>
    {/if}
  </div>
</details>

<style lang="scss">
  .settings {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    box-shadow: 0 8px 24px rgb(41 39 33 / 4%);
  }
  summary {
    padding: 14px 18px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 650;
    color: $color-text-muted;
    user-select: none;
    &:hover {
      color: $color-text;
    }
  }
  .body {
    padding: 2px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  h4 {
    font-size: 0.72rem;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 6px;
  }
  .help {
    display: inline-grid;
    width: 16px;
    height: 16px;
    margin-left: 3px;
    place-items: center;
    border: 1px solid $color-border-strong;
    border-radius: 50%;
    padding: 0;
    background: transparent;
    color: inherit;
    cursor: help;
    font-size: 0.65rem;
    line-height: 1;
    text-transform: none;
  }
  .hint {
    margin: 0 0 8px;
    color: $color-text-muted;
    font-size: 0.75rem;
  }
  .slot-options,
  .custom-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
  }
  .slot-options label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: $color-text-muted;
    font-size: 0.78rem;
    text-transform: capitalize;
  }
  .favorites-only {
    display: flex;
    align-items: center;
    gap: 5px;
    color: $color-text-muted;
    font-size: 0.78rem;
  }
  .custom-slots {
    margin-top: 10px;
  }
  .custom-slots span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 7px;
    border-radius: $radius-sm;
    background: $color-surface-2;
    color: $color-text-muted;
    font-size: 0.75rem;
  }
  .custom-slots button {
    padding: 0;
    border: 0;
    background: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
  .custom-slot-form {
    display: flex;
    gap: 6px;
    margin-top: 10px;
  }
  .custom-slot-form input {
    width: min(220px, 100%);
    min-height: 34px;
    padding: 6px 9px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
  }
  .custom-slot-form button {
    padding: 6px 10px;
    border: 0;
    border-radius: $radius-sm;
    background: $color-accent;
    color: white;
    cursor: pointer;
  }
  .repeat-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
  }
  .mt-label {
    width: 100px;
    flex-shrink: 0;
    font-size: 0.78rem;
    color: $color-text-muted;
    text-transform: capitalize;
  }
  .days {
    display: flex;
    align-items: center;
  }
  .day {
    font-size: 0.72rem;
    color: $color-text-muted;
    width: 28px;
    text-align: center;
  }
  .gap {
    position: relative;
    width: 16px;
    height: 20px;
    padding: 0;
    border: none;
    background: none;
    color: $color-border;
    cursor: pointer;

    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: currentColor;
      content: '';
      transform: translate(-50%, -50%);
    }

    &.joined {
      color: $color-accent;
      &::before {
        width: 16px;
        height: 2px;
        border-radius: 0;
      }
    }
    &:hover {
      color: $color-accent;
    }
  }

  @media (max-width: 640px) {
    .repeat-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }
    .days {
      width: 100%;
      justify-content: space-between;
    }
    .day {
      width: auto;
    }
  }
</style>
