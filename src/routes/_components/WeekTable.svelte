<script lang="ts">
  import type { SlotWithMeal, PlanDetail, NutritionTargets } from '$lib/types'
  import { MEAL_TYPES } from '$lib/constants'
  import type { Meal } from '$lib/schema'
  import MealCell from './MealCell.svelte'
  import NutritionBar from './NutritionBar.svelte'
  import BonusItems from './BonusItems.svelte'

  let {
    plan,
    meals,
    weekStart,
    targets,
    onSlotChange,
    onAutoCompose,
    onCopyWeek,
    onAddBonus,
    onDeleteBonus,
    onRecalcDay,
    onPrevWeek,
    onNextWeek,
  }: {
    plan: PlanDetail
    meals: Meal[]
    weekStart: string
    targets: NutritionTargets
    onSlotChange: (
      date: string,
      mealType: string,
      mealId: number | null,
    ) => void
    onAutoCompose?: (favoritesOnly: boolean) => void
    onCopyWeek?: () => void
    onAddBonus: (
      date: string,
      fields: {
        name: string
        calories: number | null
        proteinG: number | null
        carbsG: number | null
        fatG: number | null
      },
    ) => void
    onDeleteBonus: (id: number) => void
    onRecalcDay: (date: string) => void
    onPrevWeek: () => void
    onNextWeek: () => void
  } = $props()

  let favoritesOnly = $state(false)

  const fmtUTC = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en', { timeZone: 'UTC', ...opts })

  const isoDate = (d: Date) => d.toISOString().slice(0, 10) // extract YYYY-MM-DD from UTC ISO string

  const weekDates = $derived(
    Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(weekStart)
      dt.setUTCDate(dt.getUTCDate() + d)
      return dt
    }),
  )

  const monthLabel = $derived.by(() => {
    const [s, e] = [weekDates[0], weekDates[6]]
    if (s.getUTCMonth() === e.getUTCMonth())
      return fmtUTC(s, { month: 'long', year: 'numeric' })
    const startOpts: Intl.DateTimeFormatOptions =
      s.getUTCFullYear() !== e.getUTCFullYear()
        ? { month: 'short', year: 'numeric' }
        : { month: 'short' }
    return `${fmtUTC(s, startOpts)} – ${fmtUTC(e, { month: 'short', year: 'numeric' })}`
  })

  const todayISO = isoDate(new Date())

  const slotMap = $derived(
    new Map(plan.slots.map((s) => [`${s.date}-${s.mealType}`, s])),
  )

  const dailyNutrition = $derived(
    weekDates.map((dt) => {
      const daySlots = plan.slots.filter((s) => s.date === isoDate(dt))
      const dayBonus = plan.bonus.filter((b) => b.date === isoDate(dt))
      return {
        calories:
          daySlots.reduce((sum, s) => sum + (s.calories ?? 0), 0) +
          dayBonus.reduce((sum, b) => sum + (b.calories ?? 0), 0),
        proteinG:
          daySlots.reduce((sum, s) => sum + parseFloat(s.proteinG ?? '0'), 0) +
          dayBonus.reduce((sum, b) => sum + parseFloat(b.proteinG ?? '0'), 0),
        carbsG:
          daySlots.reduce((sum, s) => sum + parseFloat(s.carbsG ?? '0'), 0) +
          dayBonus.reduce((sum, b) => sum + parseFloat(b.carbsG ?? '0'), 0),
        fatG:
          daySlots.reduce((sum, s) => sum + parseFloat(s.fatG ?? '0'), 0) +
          dayBonus.reduce((sum, b) => sum + parseFloat(b.fatG ?? '0'), 0),
      }
    }),
  )
</script>

<div class="cal-wrap">
  <div class="week-nav">
    <button class="nav-btn" onclick={onPrevWeek} aria-label="Previous week"
      >‹</button
    >
    <span class="month-label">{monthLabel}</span>
    <button class="nav-btn" onclick={onNextWeek} aria-label="Next week"
      >›</button
    >
  </div>

  <div class="cal-scroll">
    <table class="cal">
      <thead>
        <tr>
          <th class="corner"></th>
          {#each weekDates as dt, d}
            <th class="day-head" class:today={isoDate(dt) === todayISO}>
              <span class="day-name">{fmtUTC(dt, { weekday: 'short' })}</span>
              <span class="day-num">{dt.getUTCDate()}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each MEAL_TYPES as mt}
          <tr>
            <td class="row-label">{mt.replaceAll('_', ' ')}</td>
            {#each weekDates as dt}
              <td class="slot-cell">
                <MealCell
                  slot={slotMap.get(`${isoDate(dt)}-${mt}`) ?? null}
                  {meals}
                  mealType={mt}
                  onPick={(mealId) => onSlotChange(isoDate(dt), mt, mealId)}
                />
              </td>
            {/each}
          </tr>
        {/each}
        <tr class="extras-row">
          <td class="row-label nutrition-label">extras</td>
          {#each weekDates as dt}
            <td class="slot-cell extras-cell">
              <div class="extras-inner">
                <BonusItems
                  date={isoDate(dt)}
                  items={plan.bonus.filter((b) => b.date === isoDate(dt))}
                  onAdd={onAddBonus}
                  onDelete={onDeleteBonus}
                />
                <button
                  class="btn-recalc"
                  onclick={() => onRecalcDay(isoDate(dt))}
                  title="Re-fill this day's empty slots to fit the remaining budget"
                  >Recalculate</button
                >
              </div>
            </td>
          {/each}
        </tr>
        <tr class="nutrition-row">
          <td class="row-label nutrition-label">nutrition</td>
          {#each dailyNutrition as dn}
            <td class="slot-cell nutrition-cell">
              <NutritionBar {...dn} {targets} />
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>

  {#if onAutoCompose || onCopyWeek}
    <div class="foot-actions">
      {#if onCopyWeek}
        <button class="btn-ghost" onclick={onCopyWeek}
          >Copy from last week</button
        >
      {/if}
      {#if onAutoCompose}
        <label class="favorites-only">
          <input type="checkbox" bind:checked={favoritesOnly} />
          Favourites only
        </label>
        <button
          class="btn-autocompose"
          onclick={() => onAutoCompose(favoritesOnly)}>Auto-compose</button
        >
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .cal-wrap {
    border: 1px solid $color-border;
    border-radius: $radius;
    overflow: hidden;
  }

  .cal-scroll {
    overflow-x: auto;
  }

  .cal {
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .corner {
    width: 90px;
  }

  .week-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-bottom: 1px solid $color-border;
    background: $color-surface;
  }

  .nav-btn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 2px 4px;
    border-radius: $radius-sm;
    &:hover {
      color: $color-text;
      background: $color-surface-2;
    }
  }

  .month-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: $color-text-muted;
    text-align: center;
    text-transform: none;
    letter-spacing: 0;
    flex: 1;
  }

  thead {
    background: $color-surface;
    border-bottom: 2px solid $color-border;
  }

  .day-head {
    padding: 8px 6px;
    text-align: center;
    border-left: 1px solid $color-border;

    .day-name {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      color: $color-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .day-num {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      color: $color-text;
      line-height: 1.4;
    }

    &.today {
      .day-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: $color-accent;
        color: #fff;
        border-radius: 50%;
        font-size: 0.9rem;
      }
    }
  }

  .row-label {
    padding: 0 10px;
    font-size: 0.72rem;
    font-weight: 600;
    color: $color-text-muted;
    text-transform: capitalize;
    white-space: nowrap;
    border-top: 1px solid $color-border;
    background: $color-surface;
    vertical-align: middle;
  }

  .nutrition-label {
    font-size: 0.68rem;
    color: $color-text-muted;
  }

  .slot-cell {
    border-top: 1px solid $color-border;
    border-left: 1px solid $color-border;
    padding: 0;
    vertical-align: top;
  }

  .nutrition-row {
    background: $color-surface;
  }

  .nutrition-cell {
    padding: 6px 8px;
    vertical-align: middle;
  }

  .extras-cell {
    padding: 6px 8px;
  }

  .extras-inner {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .btn-recalc {
    align-self: flex-start;
    padding: 2px 6px;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 0.65rem;
    &:hover {
      color: $color-text;
      border-color: $color-accent-dim;
    }
  }

  .foot-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid $color-border;
  }

  .btn-ghost {
    padding: 4px 12px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 500;
    &:hover {
      color: $color-text;
      border-color: $color-accent-dim;
    }
  }

  .favorites-only {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    color: $color-text-muted;
    cursor: pointer;
  }

  .btn-autocompose {
    padding: 4px 12px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 500;
    opacity: 0.85;
    &:hover {
      opacity: 1;
    }
  }
</style>
