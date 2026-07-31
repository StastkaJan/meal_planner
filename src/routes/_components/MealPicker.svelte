<script lang="ts">
  import type { Meal } from '$lib/database/schema'
  import { mealFitsSlot } from '$lib/domain/meals'

  let {
    meals,
    current,
    mealType,
    onSelect,
  }: {
    meals: Meal[]
    current: number | null
    mealType: string
    onSelect: (mealId: number | null) => void
  } = $props()

  let search = $state('')

  const filtered = $derived(
    meals.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) &&
        mealFitsSlot(m.allowedSlots, mealType),
    ),
  )
</script>

<div class="picker">
  <div class="picker-header">
    <input
      class="search"
      type="search"
      placeholder="Search meals…"
      bind:value={search}
    />
    <button class="close" onclick={() => onSelect(current)} aria-label="Cancel"
      >✕</button
    >
  </div>

  <ul class="list">
    {#if current !== null}
      <li>
        <button class="item clear-item" onclick={() => onSelect(null)}>
          Clear slot
        </button>
      </li>
    {/if}
    {#each filtered as meal (meal.id)}
      <li>
        <button
          class="item"
          class:active={meal.id === current}
          onclick={() => onSelect(meal.id)}
        >
          <span class="meal-name">{meal.name}</span>
          {#if meal.calories}
            <span class="meal-meta">{meal.calories} kcal</span>
          {/if}
        </button>
      </li>
    {:else}
      <li class="no-results">No meals found</li>
    {/each}
  </ul>
</div>

<style lang="scss">
  .picker {
    display: flex;
    flex-direction: column;
    max-height: 70vh;
  }
  .picker-header {
    display: flex;
    gap: 8px;
    padding: 16px;
    border-bottom: 1px solid $color-border;
  }
  .search {
    flex: 1;
    min-height: 44px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: 9px 11px;
    color: $color-text;
    font-size: 0.9rem;

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgb(216 95 54 / 12%);
      outline: 0;
    }
  }
  .close {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    padding: 6px;
    font-size: 1rem;
    &:hover {
      color: $color-text;
    }
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 10px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-height: 46px;
    padding: 10px 12px;
    background: none;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    cursor: pointer;
    text-align: left;
    color: $color-text;
    font-size: 0.875rem;
    transition: background 0.1s;

    &:hover {
      background: #f5f1e9;
    }
    &.active {
      border-color: $color-accent;
      background: $color-accent-dim;
    }
  }
  .clear-item {
    color: $color-danger;
  }
  .meal-name {
    flex: 1;
  }
  .meal-meta {
    font-size: 0.75rem;
    color: $color-text-muted;
    margin-left: 8px;
  }
  .no-results {
    padding: 16px 10px;
    color: $color-text-muted;
    font-size: 0.875rem;
  }
</style>
