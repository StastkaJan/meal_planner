<script lang="ts">
  import type { MealPickerItem } from '$lib/types'
  import { goto } from '$app/navigation'
  import { page as currentPage } from '$app/state'
  import { onDestroy } from 'svelte'
  import { useI18n } from '$lib/i18n-context'

  const { t } = useI18n()

  let {
    meals,
    current,
    query,
    mine,
    page,
    hasMore,
    onSelect,
    onClose,
  }: {
    meals: MealPickerItem[]
    current: number | null
    query: string
    mine: boolean
    page: number
    hasMore: boolean
    onSelect: (mealId: number | null) => void
    onClose: () => void
  } = $props()

  let search = $derived(query)
  let timer: ReturnType<typeof setTimeout>
  onDestroy(() => clearTimeout(timer))
  function filter(nextPage = 1, nextMine = mine) {
    clearTimeout(timer)
    const url = new URL(currentPage.url)
    url.searchParams.set('pickQuery', search)
    url.searchParams.set('pickMine', nextMine ? '1' : '0')
    url.searchParams.set('pickPage', String(nextPage))
    return goto(url, { noScroll: true, keepFocus: true, replaceState: true })
  }
</script>

<div class="picker">
  <div class="picker-header">
    <input
      class="search"
      type="search"
      placeholder={t('Search meals…')}
      bind:value={search}
      oninput={() => {
        clearTimeout(timer)
        timer = setTimeout(() => filter(), 250)
      }}
    />
    <button class="close" onclick={onClose} aria-label={t('Cancel')}>✕</button>
  </div>
  <label class="my-recipes">
    <input
      type="checkbox"
      checked={mine}
      onchange={(event) => filter(1, event.currentTarget.checked)}
    />
    {t('My recipes only')}
  </label>

  <ul class="list">
    {#if current !== null}
      <li>
        <button class="item clear-item" onclick={() => onSelect(null)}>
          {t('Clear slot')}
        </button>
      </li>
    {/if}
    {#each meals as meal (meal.id)}
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
      <li class="no-results">{t('No meals found')}</li>
    {/each}
  </ul>
  <nav class="picker-header" aria-label={t('Pagination')}>
    <button disabled={page === 1} onclick={() => filter(page - 1)}
      >{t('Previous page')}</button
    >
    <span>{page}</span>
    <button disabled={!hasMore} onclick={() => filter(page + 1)}
      >{t('Next page')}</button
    >
  </nav>
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
    border: 1px solid $color-border-strong;
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
  .my-recipes {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border-bottom: 1px solid $color-border;
    color: $color-text-muted;
    font-size: 0.78rem;
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
