<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import WeekTable from '$lib/components/WeekTable.svelte';
  import PlanSettings from '$lib/components/PlanSettings.svelte';

  let { data }: { data: PageData } = $props();

  let creating = $state(false);
  let newPlanName = $state('');
  // writable $derived: resets from load on navigation, reassigned locally after a fetch mutation
  let plan = $derived(data.plan);

  function planUrl(planId: number, week: string) {
    return `/?plan=${planId}&week=${week}`;
  }

  function shiftWeek(delta: number) {
    const d = new Date(data.viewWeek); // ISO date string → UTC midnight, no tz shift
    d.setUTCDate(d.getUTCDate() + delta * 7);
    const nextWeek = d.toISOString().slice(0, 10);
    goto(planUrl(data.activePlanId, nextWeek), { noScroll: true, keepFocus: true, replaceState: true });
  }

  function switchPlan(id: number) {
    const week = data.plans.find((p) => p.id === id)?.weekStart ?? data.viewWeek;
    goto(planUrl(id, week), { noScroll: true, keepFocus: true });
  }

  async function createPlan() {
    if (!newPlanName.trim()) return;
    const created = await fetch('/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newPlanName.trim() }),
    }).then(r => r.json());
    newPlanName = '';
    creating = false;
    await goto(planUrl(created.id, created.weekStart));
  }

  async function deletePlan(id: number) {
    if (!confirm('Delete this plan?')) return;
    await fetch(`/plans/${id}`, { method: 'DELETE' });
    await goto('/');
  }

  async function handleSlotChange(day: number, mealType: string, mealId: number | null) {
    if (!plan) return;
    await fetch(`/plans/${plan.id}/slots`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week: data.viewWeek, dayOfWeek: day, mealType, mealId }),
    });
    plan = await fetch(`/plans/${plan.id}?week=${data.viewWeek}`).then(r => r.json());
  }

  async function handleAutoCompose() {
    if (!plan) return;
    await fetch(`/plans/${plan.id}/autocompose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week: data.viewWeek }),
    });
    plan = await fetch(`/plans/${plan.id}?week=${data.viewWeek}`).then(r => r.json());
  }

  async function handleCopyWeek() {
    if (!plan) return;
    const d = new Date(data.viewWeek);
    d.setUTCDate(d.getUTCDate() - 7);
    const from = d.toISOString().slice(0, 10);
    if (!confirm('Copy last week into this week? Existing slots will be overwritten.')) return;
    await fetch(`/plans/${plan.id}/copy-week`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: data.viewWeek }),
    });
    plan = await fetch(`/plans/${plan.id}?week=${data.viewWeek}`).then(r => r.json());
  }

  async function handleSettingsChange(patch: object) {
    if (!plan) return;
    const updated = await fetch(`/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.json());
    plan = { ...plan, ...updated };
  }
</script>

<div class="page">
  <div class="plan-bar">
    <div class="plan-tabs">
      {#each data.plans as p (p.id)}
        <button
          class="tab"
          class:active={p.id === data.activePlanId}
          onclick={() => switchPlan(p.id)}
        >{p.name}</button>
      {/each}
    </div>

    <div class="plan-actions">
      {#if creating}
        <input
          class="new-name"
          type="text"
          placeholder="Plan name…"
          bind:value={newPlanName}
          onkeydown={(e) => { if (e.key === 'Enter') createPlan(); if (e.key === 'Escape') creating = false; }}
          autofocus
        />
        <button class="btn" onclick={createPlan}>Add</button>
        <button class="btn ghost" onclick={() => creating = false}>Cancel</button>
      {:else}
        <button class="btn" onclick={() => creating = true}>+ New plan</button>
        {#if data.activePlanId}
          <a class="btn" href="/plans/{data.activePlanId}/shopping?week={data.viewWeek}">Shopping list</a>
          <button class="btn danger" onclick={() => deletePlan(data.activePlanId)}>Delete</button>
        {/if}
      {/if}
    </div>
  </div>

  {#if plan}
    <PlanSettings {plan} onChange={handleSettingsChange} />
    <WeekTable
      {plan}
      meals={data.meals}
      weekStart={data.viewWeek}
      targets={data.targets}
      onSlotChange={handleSlotChange}
      onAutoCompose={handleAutoCompose}
      onCopyWeek={handleCopyWeek}
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

    &:hover { color: $color-text; border-color: $color-accent-dim; }
    &.active { background: $color-accent-dim; border-color: $color-accent; color: $color-text; }
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
    &:focus { outline: 2px solid $color-accent; border-color: transparent; }
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
    &:hover { opacity: 0.85; }
    &.ghost { background: $color-surface; color: $color-text-muted; border: 1px solid $color-border; }
    &.danger { background: $color-danger; }
  }
  .empty-state {
    color: $color-text-muted;
    font-size: 0.9rem;
    padding: 40px 0;
    text-align: center;
  }
</style>
