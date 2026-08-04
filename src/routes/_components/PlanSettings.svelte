<script lang="ts">
  import type { SlotRepeat } from '$lib/database/schema'
  import { MEAL_TYPES } from '$lib/constants'

  let {
    plan,
    onPortionsChange,
    onRepeatChange,
  }: {
    plan: {
      portions: number
      slotRepeats?: Pick<SlotRepeat, 'mealType' | 'groupBreaks'>[]
    }
    onPortionsChange?: (portions: number) => void
    onRepeatChange?: (mealType: string, groupBreaks: boolean[]) => void
  } = $props()

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
      <h4>People served</h4>
      <input
        class="portions"
        type="number"
        min="1"
        max="100"
        value={plan.portions}
        aria-label="People served"
        onchange={(event) =>
          onPortionsChange?.(Number(event.currentTarget.value))}
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
  .portions {
    width: 90px;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;
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
