<script lang="ts">
  import type { MealPickerItem } from '$lib/types'
  import { beforeNavigate, goto } from '$app/navigation'
  import { page as currentPage } from '$app/state'
  import { onDestroy } from 'svelte'
  import { useI18n } from '$lib/i18n-context'
  import Button from '$lib/components/ui/Button.svelte'

  const { t } = useI18n()

  let {
    meals,
    current,
    query,
    mine,
    page,
    hasMore,
    disabled = false,
    onSelect,
    onClose,
  }: {
    meals: MealPickerItem[]
    current: number | null
    query: string
    mine: boolean
    page: number
    hasMore: boolean
    disabled?: boolean
    onSelect: (mealId: number | null) => void
    onClose: () => void
  } = $props()

  let draft = $state<string | null>(null)
  const search = $derived(draft ?? query)
  let timer: ReturnType<typeof setTimeout>
  let latestFilter = 0
  onDestroy(() => clearTimeout(timer))
  beforeNavigate(({ to }) => {
    if (!to?.url.searchParams.has('pickDate')) clearTimeout(timer)
  })
  async function filter(nextPage = 1, nextMine = mine) {
    clearTimeout(timer)
    const revision = ++latestFilter
    const submittedQuery = search
    const url = new URL(currentPage.url)
    url.searchParams.set('pickQuery', submittedQuery)
    url.searchParams.set('pickMine', nextMine ? '1' : '0')
    url.searchParams.set('pickPage', String(nextPage))
    await goto(url, { noScroll: true, keepFocus: true, replaceState: true })
    if (revision === latestFilter && draft === submittedQuery) draft = null
  }

  function selectMeal(mealId: number | null) {
    clearTimeout(timer)
    onSelect(mealId)
  }
</script>

<fieldset class="picker" {disabled}>
  <div class="picker-header">
    <input
      class="search"
      type="search"
      placeholder={t('Search meals…')}
      value={search}
      oninput={(event) => {
        draft = event.currentTarget.value
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
        <button class="item clear-item" onclick={() => selectMeal(null)}>
          {t('Clear slot')}
        </button>
      </li>
    {/if}
    {#each meals as meal (meal.id)}
      <li>
        <button
          class="item"
          class:active={meal.id === current}
          onclick={() => selectMeal(meal.id)}
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
  <nav class="picker-footer" aria-label={t('Pagination')}>
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled || page === 1}
      onclick={() => filter(page - 1)}>{t('Previous page')}</Button
    >
    <span>{page}</span>
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled || !hasMore}
      onclick={() => filter(page + 1)}>{t('Next page')}</Button
    >
  </nav>
</fieldset>

<style lang="scss">
  .picker {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
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
    min-width: 0;
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
    min-width: 0;
    overflow-wrap: anywhere;
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
  .picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid $color-border;
    font-size: 0.8rem;
  }
  .item:disabled {
    opacity: 0.55;
    cursor: wait;
  }
</style>
