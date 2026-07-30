<script lang="ts">
  import type { Plan, SlotRepeat } from '$lib/database/schema'
  import { CUISINE_OPTIONS, DIET_OPTIONS, MEAL_TYPES } from '$lib/constants'
  import ChoiceChips from '$lib/components/ui/ChoiceChips.svelte'

  let {
    plan,
    onChange,
    onRepeatChange,
  }: {
    plan: Pick<Plan, 'cuisinePrefs' | 'dietaryRestrictions'> & {
      slotRepeats?: Pick<SlotRepeat, 'mealType' | 'groupBreaks'>[]
    }
    onChange: (
      patch: Partial<Pick<Plan, 'cuisinePrefs' | 'dietaryRestrictions'>>,
    ) => void
    onRepeatChange?: (mealType: string, groupBreaks: boolean[]) => void
  } = $props()

  let cuisinePrefs = $derived(plan.cuisinePrefs ?? [])
  let dietaryRestrictions = $derived(plan.dietaryRestrictions ?? [])

  let debounce: ReturnType<typeof setTimeout>

  function onCuisineChange() {
    clearTimeout(debounce)
    debounce = setTimeout(() => onChange({ cuisinePrefs }), 400)
  }

  function onDietChange() {
    clearTimeout(debounce)
    debounce = setTimeout(() => onChange({ dietaryRestrictions }), 400)
  }

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // no saved row = every day independent, same as all gaps split
  const NO_GROUPING = [true, true, true, true, true, true]

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
  <summary>Plan settings</summary>
  <div class="body">
    <section>
      <h4>Cuisine preferences</h4>
      <ChoiceChips
        options={CUISINE_OPTIONS}
        bind:selected={cuisinePrefs}
        onChange={onCuisineChange}
      />
    </section>

    <section>
      <h4>Dietary restrictions</h4>
      <ChoiceChips
        options={DIET_OPTIONS}
        bind:selected={dietaryRestrictions}
        format={(value) => value.replace('_', ' ')}
        onChange={onDietChange}
      />
    </section>

    {#if onRepeatChange}
      <section>
        <h4>Repeat pattern</h4>
        {#each MEAL_TYPES as mealType}
          {@const breaks = breaksFor(mealType)}
          <div class="repeat-row">
            <span class="mt-label">{mealType.replace('_', ' ')}</span>
            <div class="days">
              {#each DAY_LABELS as day, i}
                <span class="day">{day}</span>
                {#if i < 6}
                  <button
                    type="button"
                    class="gap"
                    class:joined={!breaks[i]}
                    title={breaks[i] ? 'Different meal' : 'Same meal'}
                    aria-label={`${mealType.replace('_', ' ')}: ${day} and ${DAY_LABELS[i + 1]} use the same meal`}
                    aria-pressed={!breaks[i]}
                    onclick={() => toggleGap(mealType, i)}
                  >
                    {breaks[i] ? '·' : '—'}
                  </button>
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
    margin-bottom: 16px;
  }
  summary {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: $color-text-muted;
    user-select: none;
    &:hover {
      color: $color-text;
    }
  }
  .body {
    padding: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h4 {
    font-size: 0.75rem;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 6px;
  }
  .repeat-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
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
    width: 16px;
    height: 20px;
    border: none;
    background: none;
    color: $color-border;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;

    &.joined {
      color: $color-accent;
      font-weight: 700;
    }
    &:hover {
      color: $color-accent;
    }
  }
</style>
