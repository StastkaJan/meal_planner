<script lang="ts">
  import { goto } from '$app/navigation'
  import type { PageData } from './$types'
  import { addDays } from '$lib/date'
  import * as planApi from '$lib/api/plans'
  import WeekTable from './_components/WeekTable.svelte'
  import PlanSettings from './_components/PlanSettings.svelte'

  let { data }: { data: PageData } = $props()

  let creating = $state(false)
  let newPlanName = $state('')
  // writable $derived: resets from load on navigation, reassigned locally after a fetch mutation
  let plan = $derived(data.plan)

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

  function switchPlan(id: number) {
    const week = data.plans.find((p) => p.id === id)?.weekStart ?? data.viewWeek
    goto(planUrl(id, week), { noScroll: true, keepFocus: true })
  }

  async function createPlan() {
    if (!newPlanName.trim()) return
    const created = await planApi.createPlan(newPlanName.trim())
    newPlanName = ''
    creating = false
    await goto(planUrl(created.id, created.weekStart))
  }

  async function deletePlan(id: number) {
    if (!confirm('Delete this plan?')) return
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

  async function handleAutoCompose(favoritesOnly: boolean) {
    if (!plan) return
    const { filled } = await planApi.populatePlan(
      plan.id,
      data.viewWeek,
      favoritesOnly,
    )
    if (filled === 0) {
      alert(
        favoritesOnly
          ? "No favourited meals fit any empty slot — mark some meals as favourites first, or turn off 'Favourites only'."
          : 'No empty slots to fill.',
      )
    }
    await refreshPlan()
  }

  async function handleCopyWeek() {
    if (!plan) return
    const from = addDays(data.viewWeek, -7)
    if (
      !confirm(
        'Copy last week into this week? Existing slots will be overwritten.',
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
    alert(body.message ?? 'Something went wrong.')
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
      alert('Nothing to recalculate — that day has no empty slots.')
    await refreshPlan()
  }

  async function handleSettingsChange(patch: object) {
    if (!plan) return
    const updated = await planApi.updatePlan(plan.id, patch)
    plan = { ...plan, ...updated }
  }

  async function handleRepeatChange(mealType: string, groupBreaks: boolean[]) {
    if (!plan) return
    await planApi.setSlotRepeat(plan.id, mealType, groupBreaks)
    await refreshPlan()
  }
</script>

<div class="page">
  <div class="plan-bar">
    <div class="plan-tabs">
      {#each data.plans as p (p.id)}
        <button
          class="tab"
          class:active={p.id === data.activePlanId}
          onclick={() => switchPlan(p.id)}>{p.name}</button
        >
      {/each}
    </div>

    <div class="plan-actions">
      {#if creating}
        <input
          class="new-name"
          type="text"
          placeholder="Plan name…"
          bind:value={newPlanName}
          onkeydown={(e) => {
            if (e.key === 'Enter') createPlan()
            if (e.key === 'Escape') creating = false
          }}
        />
        <button class="btn" onclick={createPlan}>Add</button>
        <button class="btn ghost" onclick={() => (creating = false)}
          >Cancel</button
        >
      {:else}
        <button class="btn" onclick={() => (creating = true)}>+ New plan</button
        >
        {#if data.activePlanId}
          <a
            class="btn"
            href="/plans/{data.activePlanId}/shopping?week={data.viewWeek}"
            >Shopping list</a
          >
          <button
            class="btn danger"
            onclick={() => deletePlan(data.activePlanId)}>Delete</button
          >
        {/if}
      {/if}
    </div>
  </div>

  {#if plan}
    <PlanSettings
      {plan}
      onChange={handleSettingsChange}
      onRepeatChange={handleRepeatChange}
    />
    <WeekTable
      {plan}
      meals={data.meals}
      weekStart={data.viewWeek}
      targets={data.targets}
      onSlotChange={handleSlotChange}
      onAutoCompose={handleAutoCompose}
      onCopyWeek={handleCopyWeek}
      onAddBonus={handleAddBonus}
      onDeleteBonus={handleDeleteBonus}
      onRecalcDay={handleRecalcDay}
      onPrevWeek={() => shiftWeek(-1)}
      onNextWeek={() => shiftWeek(1)}
    />
  {:else if data.plans.length === 0}
    <p class="empty-state">No plans yet. Create one to get started.</p>
  {:else}
    <p class="empty-state">Loading…</p>
  {/if}
</div>

<style lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .plan-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }
  .plan-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .tab {
    padding: 5px 14px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: 0.85rem;
    color: $color-text-muted;
    transition: all 0.15s;

    &:hover {
      color: $color-text;
      border-color: $color-accent-dim;
    }
    &.active {
      background: $color-accent-dim;
      border-color: $color-accent;
      color: $color-text;
    }
  }
  .plan-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .new-name {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: 5px 10px;
    color: $color-text;
    width: 160px;
    &:focus {
      outline: 2px solid $color-accent;
      border-color: transparent;
    }
  }
  .btn {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    padding: 5px 14px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: opacity 0.15s;
    &:hover {
      opacity: 0.85;
    }
    &.ghost {
      background: $color-surface;
      color: $color-text-muted;
      border: 1px solid $color-border;
    }
    &.danger {
      background: $color-danger;
    }
  }
  .empty-state {
    color: $color-text-muted;
    font-size: 0.9rem;
    padding: 40px 0;
    text-align: center;
  }
</style>
