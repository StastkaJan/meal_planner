<script lang="ts">
  import type {
    SlotWithMeal,
    PlanDetail,
    DailyNutritionTargets,
  } from '$lib/types'
  import MealCell from './MealCell.svelte'
  import type { SavedExtra } from '$lib/database/schema'
  import type { ExtraFields } from '$lib/domain/extras'
  import NutritionBar from './NutritionBar.svelte'
  import BonusItems from './BonusItems.svelte'
  import { localeCode } from '$lib/i18n'
  import { useI18n } from '$lib/i18n-context'

  const { t, label, locale } = useI18n()

  let {
    savedExtras,
    onSaveExtra,
    onDeleteSavedExtra,
    plan,
    onOpenPicker,
    weekStart,
    targets,
    isPro,
    onSlotChange,
    onAddBonus,
    onDeleteBonus,
    onRecalcDay,
    onRerollMeal,
    onClearDay,
    busy,
    onPrevWeek,
    onNextWeek,
  }: {
    savedExtras: SavedExtra[]
    onSaveExtra: (fields: ExtraFields) => Promise<void>
    onDeleteSavedExtra: (id: number) => Promise<void>
    plan: PlanDetail
    onOpenPicker: (date: string, mealType: string) => void
    weekStart: string
    targets: DailyNutritionTargets
    isPro: boolean
    onSlotChange: (
      date: string,
      mealType: string,
      mealId: number | null,
    ) => void
    onAddBonus: (
      date: string,
      fields: {
        name: string
        calories: number | null
        proteinG: number | null
        carbsG: number | null
        fatG: number | null
        fiberG?: number | null
        sugarG?: number | null
        saturatedFatG?: number | null
        saltG?: number | null
      },
    ) => Promise<void>
    onDeleteBonus: (id: number) => void
    onRecalcDay: (date: string) => void
    onRerollMeal: (date: string, mealType: string) => Promise<void>
    onClearDay: (date: string) => Promise<void>
    busy: boolean
    onPrevWeek: () => void
    onNextWeek: () => void
  } = $props()

  const fmtUTC = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString(localeCode(locale()), { timeZone: 'UTC', ...opts })

  const isoDate = (d: Date) => d.toISOString().slice(0, 10) // extract YYYY-MM-DD from UTC ISO string

  function positionDayActions(event: MouseEvent) {
    const button = event.currentTarget as HTMLButtonElement
    const menu = button.popoverTargetElement as HTMLElement
    const rect = button.getBoundingClientRect()
    menu.style.top = `${rect.bottom + 4}px`
    menu.style.left = `${Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200))}px`
  }

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
        fiberG:
          daySlots.reduce((sum, s) => sum + parseFloat(s.fiberG ?? '0'), 0) +
          dayBonus.reduce((sum, b) => sum + parseFloat(b.fiberG ?? '0'), 0),
        sugarG:
          daySlots.reduce((sum, s) => sum + parseFloat(s.sugarG ?? '0'), 0) +
          dayBonus.reduce((sum, b) => sum + parseFloat(b.sugarG ?? '0'), 0),
        saturatedFatG:
          daySlots.reduce(
            (sum, s) => sum + parseFloat(s.saturatedFatG ?? '0'),
            0,
          ) +
          dayBonus.reduce(
            (sum, b) => sum + parseFloat(b.saturatedFatG ?? '0'),
            0,
          ),
        saltG:
          daySlots.reduce((sum, s) => sum + parseFloat(s.saltG ?? '0'), 0) +
          dayBonus.reduce((sum, b) => sum + parseFloat(b.saltG ?? '0'), 0),
      }
    }),
  )
</script>

<div class="cal-wrap">
  <div class="week-nav">
    <button
      class="nav-btn"
      onclick={onPrevWeek}
      aria-label={t('Previous week')}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true"
        ><path d="m12 5-5 5 5 5" /></svg
      >
    </button>
    <span class="month-label">{monthLabel}</span>
    <button class="nav-btn" onclick={onNextWeek} aria-label={t('Next week')}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5" /></svg
      >
    </button>
  </div>

  <div
    class="cal-scroll"
    onscroll={(event) => {
      event.currentTarget
        .querySelectorAll<HTMLElement>(':popover-open')
        .forEach((menu) => menu.hidePopover())
    }}
  >
    <table class="cal">
      <thead>
        <tr>
          <th class="corner"></th>
          {#each weekDates as dt (isoDate(dt))}
            {@const menuId = `day-actions-${plan.id}-${isoDate(dt)}`}
            <th class="day-head" class:today={isoDate(dt) === todayISO}>
              <span class="day-name">{fmtUTC(dt, { weekday: 'short' })}</span>
              <span class="day-num">{dt.getUTCDate()}</span>
              <button
                class="day-menu-toggle"
                popovertarget={menuId}
                aria-label={t('Actions for {date}', {
                  date: fmtUTC(dt, { dateStyle: 'full' }),
                })}
                onclick={positionDayActions}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="4" cy="10" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="16" cy="10" r="1.5" />
                </svg>
              </button>
              <div id={menuId} class="day-actions" popover="auto">
                <button
                  disabled={busy || !isPro}
                  popovertarget={menuId}
                  popovertargetaction="hide"
                  onclick={() => onRecalcDay(isoDate(dt))}
                  title={t(
                    "Re-fill this day's empty slots to fit the remaining budget",
                  )}
                  >{t('Recalculate day')}{#if !isPro}
                    · {t('Pro')}{/if}</button
                >
                <button
                  class="clear-day"
                  disabled={busy ||
                    (!plan.slots.some((slot) => slot.date === isoDate(dt)) &&
                      !plan.bonus.some((item) => item.date === isoDate(dt)))}
                  popovertarget={menuId}
                  popovertargetaction="hide"
                  onclick={() => onClearDay(isoDate(dt))}
                  >{t('Clear day')}</button
                >
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each plan.mealSlots as mt}
          <tr>
            <td class="row-label">{label(mt)}</td>
            {#each weekDates as dt}
              {@const date = isoDate(dt)}
              {@const slot = slotMap.get(`${date}-${mt}`) ?? null}
              <td class="slot-cell">
                <MealCell
                  {slot}
                  onOpenPicker={() => onOpenPicker(date, mt)}
                  mealType={mt}
                  onPick={(mealId) => onSlotChange(date, mt, mealId)}
                  onReroll={() => onRerollMeal(date, mt)}
                  {isPro}
                  {busy}
                />
              </td>
            {/each}
          </tr>
        {/each}
        <tr class="extras-row">
          <td class="row-label nutrition-label">{t('extras')}</td>
          {#each weekDates as dt}
            <td class="slot-cell extras-cell">
              <div class="extras-inner">
                <BonusItems
                  {savedExtras}
                  onSave={onSaveExtra}
                  onDeleteSaved={onDeleteSavedExtra}
                  date={isoDate(dt)}
                  items={plan.bonus.filter((b) => b.date === isoDate(dt))}
                  onAdd={onAddBonus}
                  onDelete={onDeleteBonus}
                />
              </div>
            </td>
          {/each}
        </tr>
        <tr class="nutrition-row">
          <td class="row-label nutrition-label">{t('nutrition')}</td>
          {#each dailyNutrition as dn}
            <td class="slot-cell nutrition-cell">
              <NutritionBar {...dn} {targets} />
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>
</div>

<style lang="scss">
  .cal-wrap {
    border: 1px solid $color-border;
    border-radius: $radius;
    overflow: hidden;
    background: $color-surface;
    box-shadow: 0 16px 40px rgb(41 39 33 / 7%);
  }

  .cal-scroll {
    overflow-x: auto;
  }

  .cal {
    width: 100%;
    min-width: 1120px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .corner {
    width: 108px;
  }

  .week-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid $color-border;
    background: #faf8f2;
  }

  .nav-btn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    padding: 0;
    border-radius: 50%;
    &:hover {
      color: $color-text;
      background: $color-surface-2;
    }

    svg {
      display: block;
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
  }

  .month-label {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
    font-weight: 500;
    color: $color-text;
    text-align: center;
    text-transform: none;
    letter-spacing: 0;
    flex: 1;
  }

  thead {
    background: #faf8f2;
    border-bottom: 1px solid $color-border;
  }

  .day-head {
    position: relative;
    padding: 12px 6px;
    text-align: center;
    border-left: 1px solid $color-border;

    .day-name {
      display: block;
      font-size: 0.64rem;
      font-weight: 700;
      color: $color-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .day-num {
      display: block;
      font-size: 1.05rem;
      font-weight: 650;
      color: $color-text;
      line-height: 1.4;
    }

    &.today {
      .day-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        background: $color-accent;
        color: #fff;
        border-radius: 50%;
        font-size: 0.9rem;
      }
    }
  }

  .row-label {
    position: sticky;
    left: 0;
    z-index: 2;
    padding: 0 12px;
    font-size: 0.72rem;
    font-weight: 600;
    color: $color-text-muted;
    text-transform: capitalize;
    white-space: nowrap;
    border-top: 1px solid $color-border;
    background: #faf8f2;
    vertical-align: middle;
  }

  .nutrition-label {
    font-size: 0.68rem;
    color: $color-text-muted;
  }

  .slot-cell {
    height: 1px;
    border-top: 1px solid $color-border;
    border-left: 1px solid $color-border;
    padding: 0;
    vertical-align: top;
  }

  .nutrition-row {
    background: $color-surface;
  }

  .nutrition-cell {
    padding: 10px;
    vertical-align: top;
  }

  .extras-cell {
    padding: 8px;
  }

  .extras-inner {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .day-menu-toggle {
    position: absolute;
    top: 2px;
    right: 2px;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin: 0.25rem;
    padding: 0;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-muted;
    cursor: pointer;
    svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    &:hover {
      background: $color-surface-2;
      color: $color-text;
    }
  }

  .day-actions {
    position: fixed;
    inset: auto;
    margin: 0;
    width: 192px;
    padding: 4px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    box-shadow: 0 6px 20px rgb(41 39 33 / 12%);

    button {
      display: block;
      width: 100%;
      min-height: 40px;
      padding: 8px 10px;
      border: 0;
      border-radius: $radius-sm;
      background: transparent;
      color: $color-text;
      text-align: left;
      font-size: 0.8rem;
      cursor: pointer;
      &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      &:hover:not(:disabled) {
        background: $color-surface-2;
      }
    }

    .clear-day {
      margin-top: 4px;
      border-top: 1px solid $color-border;
      border-radius: 0;
      color: $color-danger;
    }
  }

  @media (max-width: 720px) {
    .cal-wrap {
      margin-inline: -16px;
      border-right: 0;
      border-left: 0;
      border-radius: 0;
    }
  }
</style>
