<script lang="ts">
  import type { Meal } from '$lib/schema'
  import { mealFitsSlot } from '$lib/constants'

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
      autofocus
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
    padding: 12px;
    border-bottom: 1px solid $color-border;
  }
  .search {
    flex: 1;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: 6px 10px;
    color: $color-text;
    font-size: 0.9rem;

    &:focus {
      outline: 2px solid $color-accent;
      border-color: transparent;
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
    padding: 8px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 8px 10px;
    background: none;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    cursor: pointer;
    text-align: left;
    color: $color-text;
    font-size: 0.875rem;
    transition: background 0.1s;

    &:hover {
      background: $color-surface-2;
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
