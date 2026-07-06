<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import WeekTable from '$lib/components/WeekTable.svelte';
  import PlanSettings from '$lib/components/PlanSettings.svelte';

  let { data }: { data: PageData } = $props();

  let creating = $state(false);

  let slotForm: HTMLFormElement;
  let autocomposeForm: HTMLFormElement;
  let settingsForm: HTMLFormElement;

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

  function handleSlotChange(day: number, mealType: string, mealId: number | null) {
    if (!data.plan) return;
    (slotForm.elements.namedItem('dayOfWeek') as HTMLInputElement).value = String(day);
    (slotForm.elements.namedItem('mealType') as HTMLInputElement).value = mealType;
    (slotForm.elements.namedItem('mealId') as HTMLInputElement).value = mealId === null ? '' : String(mealId);
    slotForm.requestSubmit();
  }

  function handleAutoCompose() {
    if (!data.plan) return;
    autocomposeForm.requestSubmit();
  }

  function hiddenInput(name: string, value: string) {
    const el = document.createElement('input');
    el.type = 'hidden';
    el.name = name;
    el.value = value;
    return el;
  }

  function handleSettingsChange(patch: { cuisinePrefs?: string[]; dietaryRestrictions?: string[] }) {
    if (!data.plan) return;
    const cuisinePrefs = patch.cuisinePrefs ?? data.plan.cuisinePrefs ?? [];
    const dietaryRestrictions = patch.dietaryRestrictions ?? data.plan.dietaryRestrictions ?? [];
    settingsForm.replaceChildren(
      hiddenInput('planId', String(data.plan.id)),
      ...cuisinePrefs.map((c) => hiddenInput('cuisinePrefs', c)),
      ...dietaryRestrictions.map((d) => hiddenInput('dietaryRestrictions', d)),
    );
    settingsForm.requestSubmit();
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
        <form method="POST" action="?/createPlan" class="new-plan-form"
          use:enhance={() => async ({ result, update }) => { if (result.type === 'redirect') creating = false; await update(); }}>
          <input
            class="new-name"
            type="text"
            name="name"
            placeholder="Plan name…"
            onkeydown={(e) => { if (e.key === 'Escape') creating = false; }}
            autofocus
          />
          <button class="btn" type="submit">Add</button>
          <button class="btn ghost" type="button" onclick={() => creating = false}>Cancel</button>
        </form>
      {:else}
        <button class="btn" onclick={() => creating = true}>+ New plan</button>
        {#if data.activePlanId}
          <form method="POST" action="?/deletePlan" use:enhance
            onsubmit={(e) => { if (!confirm('Delete this plan?')) e.preventDefault(); }}>
            <input type="hidden" name="id" value={data.activePlanId} />
            <button class="btn danger" type="submit">Delete</button>
          </form>
        {/if}
      {/if}
    </div>
  </div>

  <form bind:this={slotForm} method="POST" action="?/slotChange" use:enhance class="hidden-form">
    <input type="hidden" name="planId" value={data.plan?.id ?? ''} />
    <input type="hidden" name="week" value={data.viewWeek} />
    <input type="hidden" name="dayOfWeek" />
    <input type="hidden" name="mealType" />
    <input type="hidden" name="mealId" />
  </form>
  <form bind:this={autocomposeForm} method="POST" action="?/autocompose" use:enhance class="hidden-form">
    <input type="hidden" name="planId" value={data.plan?.id ?? ''} />
    <input type="hidden" name="week" value={data.viewWeek} />
  </form>
  <form bind:this={settingsForm} method="POST" action="?/settingsChange" use:enhance class="hidden-form"></form>

  {#if data.plan}
    <PlanSettings plan={data.plan} onChange={handleSettingsChange} />
    <WeekTable
      plan={data.plan}
      meals={data.meals}
      weekStart={data.viewWeek}
      onSlotChange={handleSlotChange}
      onAutoCompose={handleAutoCompose}
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
  .hidden-form {
    display: none;
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
  .new-plan-form {
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
