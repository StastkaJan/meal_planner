<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import WeekTable from "$lib/components/WeekTable.svelte";
  import PlanSettings from "$lib/components/PlanSettings.svelte";

  let { data } = $props();

  const plans = $derived(data.plans);
  const meals = $derived(data.meals);
  const activePlanId = $derived(data.activePlanId);
  const viewWeek = $derived(data.viewWeek);
  const plan = $derived(data.plan);

  let creating = $state(false);
  let newPlanName = $state("");

  function updateRoute(planId: number, week: string) {
    void goto(`/?plan=${planId}&week=${week}`, {
      noScroll: true,
      keepFocus: true,
    });
  }

  function shiftWeek(delta: number) {
    if (!activePlanId || !viewWeek) return;
    const d = new Date(viewWeek);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    updateRoute(activePlanId, d.toISOString().slice(0, 10));
  }

  function switchPlan(id: number) {
    const selected = plans.find((p) => p.id === id);
    if (!selected) return;
    updateRoute(selected.id, selected.weekStart);
  }

  async function handleSlotChange(
    day: number,
    mealType: string,
    mealId: number | null,
  ) {
    if (!plan) return;
    await fetch(`/plans/${plan.id}/slots`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        week: viewWeek,
        dayOfWeek: day,
        mealType,
        mealId,
      }),
    });
    await invalidateAll();
  }

  async function handleAutoCompose() {
    if (!plan) return;
    await fetch(`/plans/${plan.id}/autocompose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ week: viewWeek }),
    });
    await invalidateAll();
  }

  async function handleSettingsChange(patch: object) {
    if (!plan) return;
    await fetch(`/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    await invalidateAll();
  }
</script>

<div class="page">
  <div class="plan-bar">
    <div class="plan-tabs">
      {#each plans as p (p.id)}
        <button
          class="tab"
          class:active={p.id === activePlanId}
          onclick={() => switchPlan(p.id)}>{p.name}</button
        >
      {/each}
    </div>

    <div class="plan-actions">
      {#if creating}
        <form
          method="POST"
          action="?/createPlan"
          class="create-form"
          use:enhance
        >
          <input
            class="new-name"
            type="text"
            name="name"
            placeholder="Plan name..."
            bind:value={newPlanName}
            required
          />
          <button class="btn" type="submit">Add</button>
          <button
            class="btn ghost"
            type="button"
            onclick={() => {
              creating = false;
              newPlanName = "";
            }}>Cancel</button
          >
        </form>
      {:else}
        <button class="btn" onclick={() => (creating = true)}>+ New plan</button
        >
        {#if activePlanId}
          <form
            method="POST"
            action="?/deletePlan"
            use:enhance
            onsubmit={(event) => {
              if (!confirm("Delete this plan?")) event.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={activePlanId} />
            <button class="btn danger" type="submit">Delete</button>
          </form>
        {/if}
      {/if}
    </div>
  </div>

  {#if plan}
    <PlanSettings {plan} onChange={handleSettingsChange} />
    <WeekTable
      {plan}
      {meals}
      weekStart={viewWeek}
      onSlotChange={handleSlotChange}
      onAutoCompose={handleAutoCompose}
      onPrevWeek={() => shiftWeek(-1)}
      onNextWeek={() => shiftWeek(1)}
    />
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
  .create-form {
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
