<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import MealPicker from './_components/MealPicker.svelte'
  import type { PageData } from './$types'
  import { addDays } from '$lib/utils/date-time'
  import * as planApi from '$lib/api/plans'
  import { updateProfile } from '$lib/api/profile'
  import WeekTable from './_components/WeekTable.svelte'
  import PlanSettings from './_components/PlanSettings.svelte'
  import { useI18n } from '$lib/i18n-context'

  let { data }: { data: PageData } = $props()
  const { t, message } = useI18n()

  // writable $derived: resets from load on navigation, reassigned locally after a fetch mutation
  let plan = $derived(data.plan)
  let preferences = $derived(data.preferences)
  let favoritesOnly = $state(false)
  let myRecipesOnly = $state(false)

  function openPicker(date: string, mealType: string) {
    const url = new URL(page.url)
    url.searchParams.set('pickDate', date)
    url.searchParams.set('pickSlot', mealType)
    return goto(url, { noScroll: true, keepFocus: true })
  }

  function closePicker() {
    const url = new URL(page.url)
    for (const key of [
      'pickDate',
      'pickSlot',
      'pickQuery',
      'pickMine',
      'pickPage',
    ])
      url.searchParams.delete(key)
    return goto(url, { noScroll: true, keepFocus: true, replaceState: true })
  }

  async function pickMeal(mealId: number | null) {
    if (!data.picker || !plan) return
    const { date, mealType } = data.picker
    const current =
      plan.slots.find(
        (slot) => slot.date === date && slot.mealType === mealType,
      )?.mealId ?? null
    try {
      if (mealId !== current)
        await planApi.setSlot(plan.id, date, mealType, mealId)
      await closePicker()
    } catch {
      alert(t('Something went wrong.'))
    }
  }

  async function refreshPlan() {
    if (!plan) return
    plan = await planApi.getPlan(plan.id, data.viewWeek)
  }

  function planUrl(planId: number, week: string) {
    return `/?plan=${planId}&week=${week}`
  }

  function shiftWeek(delta: number) {
    const nextWeek = addDays(data.viewWeek, delta * 7)
    goto(planUrl(data.activePlanId, nextWeek), {
      noScroll: true,
      keepFocus: true,
      replaceState: true,
    })
  }

  async function createPlan() {
    const created = await planApi.createPlan()
    await goto(planUrl(created.id, created.weekStart))
  }

  async function deletePlan(id: number) {
    if (!confirm(t('Delete this plan?'))) return
    await planApi.deletePlan(id)
    await goto('/')
  }

  async function handleSlotChange(
    date: string,
    mealType: string,
    mealId: number | null,
  ) {
    if (!plan) return
    await planApi.setSlot(plan.id, date, mealType, mealId)
    await refreshPlan()
  }

  async function handleSlotLeftover(
    date: string,
    mealType: string,
    source: { date: string; mealType: string } | null,
  ) {
    if (!plan) return
    await planApi.setSlotLeftover(plan.id, date, mealType, source)
    await refreshPlan()
  }

  async function handleAutoCompose(
    favoritesOnly: boolean,
    myRecipesOnly: boolean,
  ) {
    if (!plan) return
    const { filled } = await planApi.populatePlan(
      plan.id,
      data.viewWeek,
      favoritesOnly,
      myRecipesOnly,
    )
    if (filled === 0) {
      alert(
        favoritesOnly || myRecipesOnly
          ? t('No recipes match the auto-compose filters for any empty slot.')
          : t('No empty slots to fill.'),
      )
    }
    await refreshPlan()
  }

  async function handleCopyWeek() {
    if (!plan) return
    const from = addDays(data.viewWeek, -7)
    if (
      !confirm(
        t('Copy last week into this week? Existing slots will be overwritten.'),
      )
    )
      return
    await planApi.copyWeek(plan.id, from, data.viewWeek)
    await refreshPlan()
  }

  // Surfaces a server-side error (validation, ownership) that would otherwise be
  // silently discarded; returns true if it alerted, so the caller can bail out.
  async function alertIfFailed(res: Response): Promise<boolean> {
    if (res.ok) return false
    const body = await res.json().catch(() => ({}))
    alert(body.message ? message(body.message) : t('Something went wrong.'))
    return true
  }

  async function handleAddBonus(
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
  ) {
    if (!plan) return
    const res = await planApi.addBonus(plan.id, { date, ...fields })
    if (await alertIfFailed(res)) return
    await refreshPlan()
  }

  async function handleDeleteBonus(id: number) {
    if (!plan) return
    const res = await planApi.deleteBonus(plan.id, id)
    if (await alertIfFailed(res)) return
    await refreshPlan()
  }

  async function handleRecalcDay(date: string) {
    if (!plan) return
    const res = await planApi.recalculateDay(plan.id, date)
    if (await alertIfFailed(res)) return
    const { filled } = await res.json()
    if (filled === 0)
      alert(t('Nothing to recalculate — that day has no empty slots.'))
    await refreshPlan()
  }

  async function handleRepeatChange(mealType: string, groupBreaks: boolean[]) {
    if (!plan) return
    await planApi.setSlotRepeat(plan.id, mealType, groupBreaks)
    await refreshPlan()
  }

  async function handleMealSlotsChange(mealSlots: string[]) {
    if (!plan) return
    const updated = await planApi.setPlanMealSlots(plan.id, mealSlots)
    plan = {
      ...plan,
      mealSlots: updated.mealSlots,
      slots: plan.slots.filter((slot) => mealSlots.includes(slot.mealType)),
      slotRepeats: plan.slotRepeats.filter((repeat) =>
        mealSlots.includes(repeat.mealType),
      ),
    }
  }

  async function handlePreferenceChange(patch: Partial<typeof preferences>) {
    await updateProfile(patch)
    preferences = { ...preferences, ...patch }
  }
</script>

<div class="page">
  <div class="page-heading">
    <div>
      <p class="eyebrow">{t('Weekly planner')}</p>
      <h1>{t('Meal plan')}</h1>
      <p class="subtitle">
        {t('Plan the week, balance nutrition, shop once.')}
      </p>
    </div>
  </div>
  <div class="plan-bar">
    <div class="plan-actions">
      {#if !plan}
        <button class="btn" onclick={createPlan}>{t('Create plan')}</button>
      {:else}
        <a
          class="btn"
          href="/plans/{data.activePlanId}/shopping?week={data.viewWeek}"
          >{t('Shopping list')}</a
        >
        <button class="btn danger" onclick={() => deletePlan(data.activePlanId)}
          >{t('Delete')}</button
        >
      {/if}
    </div>
  </div>

  {#if plan}
    <PlanSettings
      {plan}
      {preferences}
      isPro={data.user?.isPro ?? false}
      bind:favoritesOnly
      bind:myRecipesOnly
      onPreferenceChange={handlePreferenceChange}
      onMealSlotsChange={handleMealSlotsChange}
      onRepeatChange={handleRepeatChange}
      onAutoCompose={handleAutoCompose}
      onCopyWeek={handleCopyWeek}
    />
    <WeekTable
      {plan}
      onOpenPicker={openPicker}
      weekStart={data.viewWeek}
      targets={data.targets}
      isPro={data.user?.isPro ?? false}
      onSlotChange={handleSlotChange}
      onSlotLeftover={handleSlotLeftover}
      onAddBonus={handleAddBonus}
      onDeleteBonus={handleDeleteBonus}
      onRecalcDay={handleRecalcDay}
      onPrevWeek={() => shiftWeek(-1)}
      onNextWeek={() => shiftWeek(1)}
    />
  {:else if data.plans.length === 0}
    <p class="empty-state">{t('Create your meal plan to get started.')}</p>
  {:else}
    <p class="empty-state">{t('Loading…')}</p>
  {/if}
</div>

{#if data.picker}
  <Dialog modal class="meal-dialog" onclose={closePicker}>
    <MealPicker
      {...data.picker}
      current={plan?.slots.find(
        (slot) =>
          slot.date === data.picker?.date &&
          slot.mealType === data.picker?.mealType,
      )?.mealId ?? null}
      onSelect={pickMeal}
      onClose={closePicker}
    />
  </Dialog>
{/if}

<style lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .page-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .eyebrow {
    margin-bottom: 4px;
    color: $color-accent;
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }
  .subtitle {
    margin-top: 8px;
    color: $color-text-muted;
    font-size: 0.95rem;
  }
  .plan-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    padding-bottom: 2px;
  }
  .plan-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    min-height: 38px;
    padding: 7px 14px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 650;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgb(41 39 33 / 12%);
    }
    &.danger {
      border: 1px solid rgb(184 59 50 / 18%);
      background: #f9e4e1;
      color: $color-danger;
    }
  }
  .empty-state {
    color: $color-text-muted;
    font-size: 0.9rem;
    padding: 72px 24px;
    border: 1px dashed $color-border;
    border-radius: $radius;
    background: rgb(255 253 249 / 55%);
    text-align: center;
  }

  @media (max-width: 720px) {
    .page {
      gap: 14px;
    }
    .plan-bar {
      align-items: flex-start;
    }
    .plan-actions {
      width: 100%;
      overflow-x: auto;
      flex-wrap: nowrap;
      padding-bottom: 2px;
    }
    .btn {
      flex: 0 0 auto;
    }
  }
</style>
