<script lang="ts">
  import { onMount } from 'svelte';
  import type { Plan } from '$lib/schema';
  import type { PlanDetail } from '$lib/types';
  import type { Meal } from '$lib/schema';
  import WeekTable from '$lib/components/WeekTable.svelte';
  import PlanSettings from '$lib/components/PlanSettings.svelte';

  let plans:       Plan[]       = $state([]);
  let meals:       Meal[]       = $state([]);
  let activePlanId: number       = $state(0);
  let plan:        PlanDetail | null = $state(null);
  let newPlanName  = $state('');
  let creating     = $state(false);

  onMount(async () => {
    [plans, meals] = await Promise.all([
      fetch('/plans').then(r => r.json()),
      fetch('/meals').then(r => r.json()),
    ]);
    if (plans.length > 0) activePlanId = plans[plans.length - 1].id;
  });

  $effect(() => {
    if (!activePlanId) return;
    fetch(`/plans/${activePlanId}`).then(r => r.json()).then(d => plan = d);
  });

  async function createPlan() {
    if (!newPlanName.trim()) return;
    const res = await fetch('/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newPlanName.trim() }),
    });
    const created: Plan = await res.json();
    plans = [...plans, created];
    activePlanId = created.id;
    newPlanName = '';
    creating = false;
  }

  async function deletePlan(id: number) {
    if (!confirm('Delete this plan?')) return;
    await fetch(`/plans/${id}`, { method: 'DELETE' });
    plans = plans.filter(p => p.id !== id);
    if (activePlanId === id) activePlanId = plans[0]?.id ?? 0;
  }

  async function handleSlotChange(day: number, mealType: string, mealId: number | null) {
    if (!plan) return;
    await fetch(`/plans/${plan.id}/slots`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dayOfWeek: day, mealType, mealId }),
    });
    // re-fetch to get updated meal data
    plan = await fetch(`/plans/${plan.id}`).then(r => r.json());
  }

  async function handleAutoCompose() {
    if (!plan) return;
    await fetch(`/plans/${plan.id}/autocompose`, { method: 'POST' });
    plan = await fetch(`/plans/${plan.id}`).then(r => r.json());
  }

  async function handleSettingsChange(patch: object) {
    if (!plan) return;
    const updated = await fetch(`/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.json());
    plan = { ...plan, ...updated };
    plans = plans.map(p => p.id === plan!.id ? { ...p, ...updated } : p);
  }
</script>

<div class="page">
  <div class="plan-bar">
    <div class="plan-tabs">
      {#each plans as p (p.id)}
        <button
          class="tab"
          class:active={p.id === activePlanId}
          onclick={() => activePlanId = p.id}
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
        {#if activePlanId}
          <button class="btn danger" onclick={() => deletePlan(activePlanId)}>Delete</button>
        {/if}
      {/if}
    </div>
  </div>

  {#if plan}
    <PlanSettings {plan} onChange={handleSettingsChange} />
    <WeekTable {plan} {meals} onSlotChange={handleSlotChange} onAutoCompose={handleAutoCompose} />
  {:else if plans.length === 0}
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
