<script lang="ts">
  import { createIngredient } from '$lib/api/ingredients'
  import {
    matchIngredient,
    normalizeIngredientName,
    type IngredientOption,
  } from '$lib/domain/ingredients'
  import { useI18n } from '$lib/i18n-context'

  let {
    options,
    name = '',
    ingredientId,
    multiple = false,
    selectedIds = $bindable<number[]>([]),
    onselect,
    onchange,
  }: {
    options: IngredientOption[]
    name?: string
    ingredientId?: number
    multiple?: boolean
    selectedIds?: number[]
    onselect?: (ingredient: IngredientOption, name: string) => void
    onchange?: () => void
  } = $props()
  const { t, locale, message } = useI18n()
  let custom = $state<IngredientOption[]>([])
  let query = $state('')
  let open = $state(false)
  let disclosure: HTMLDetailsElement
  let busy = $state(false)
  let error = $state('')
  const displayName = (option: IngredientOption) =>
    locale() === 'cs' ? (option.nameCs ?? option.name) : option.name
  let all = $derived([
    ...options,
    ...custom.filter(
      (item) => !options.some((option) => option.id === item.id),
    ),
  ])
  const names = (option: IngredientOption) => [
    option.name,
    option.nameCs ?? '',
    ...option.aliases,
  ]
  let filtered = $derived(
    all.filter((option) =>
      names(option).some((value) =>
        normalizeIngredientName(value).includes(normalizeIngredientName(query)),
      ),
    ),
  )
  let exact = $derived(matchIngredient(query, all))
  let selected = $derived(all.find((option) => option.id === ingredientId))

  function choose(option: IngredientOption) {
    if (multiple) {
      selectedIds = selectedIds.includes(option.id)
        ? selectedIds.filter((id) => id !== option.id)
        : [...selectedIds, option.id]
      onchange?.()
    } else {
      onselect?.(option, displayName(option))
      open = false
      disclosure.querySelector('summary')?.focus()
      query = ''
    }
  }

  async function addCustom() {
    if (!query.trim() || busy) return
    busy = true
    error = ''
    try {
      const option = exact ?? (await createIngredient(query.trim()))
      if (!all.some((item) => item.id === option.id))
        custom = [...custom, option]
      if (!multiple || !selectedIds.includes(option.id)) choose(option)
      query = ''
    } catch (cause) {
      error = message(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      busy = false
    }
  }
</script>

<div class="ingredient-picker">
  {#if multiple}
    <div class="selected" role="group" aria-label={t('Pantry staples')}>
      {#each all.filter( (option) => selectedIds.includes(option.id) ) as option (option.id)}
        <button
          type="button"
          class="chip"
          aria-label={`${t('Remove ingredient')}: ${displayName(option)}`}
          onclick={() => choose(option)}>{displayName(option)} ×</button
        >
      {/each}
    </div>
  {/if}
  <details bind:this={disclosure} bind:open>
    <summary
      >{multiple
        ? t('Always on hand')
        : selected
          ? displayName(selected)
          : name || t('Ingredient')}</summary
    >
    <div class="choices">
      <input
        type="search"
        aria-label={locale() === 'cs'
          ? 'Hledat suroviny'
          : 'Search ingredients'}
        placeholder={locale() === 'cs'
          ? 'Hledat suroviny'
          : 'Search ingredients'}
        bind:value={query}
        onkeydown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
          if (event.key === 'Escape') {
            open = false
            disclosure.querySelector('summary')?.focus()
          }
        }}
      />
      <div class="results">
        {#each filtered as option (option.id)}
          {#if multiple}
            <label>
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onchange={() => choose(option)}
              />
              {displayName(option)}
            </label>
          {:else}
            <button type="button" onclick={() => choose(option)}
              >{displayName(option)}</button
            >
          {/if}
        {/each}
      </div>
      {#if query.trim() && !exact}
        <button type="button" disabled={busy} onclick={addCustom}>
          {locale() === 'cs'
            ? 'Přidat vlastní surovinu'
            : 'Add custom ingredient'}:
          {query.trim()}
        </button>
      {/if}
      {#if error}<p role="alert">{error}</p>{/if}
    </div>
  </details>
</div>

<style lang="scss">
  .ingredient-picker {
    min-width: 0;
  }
  summary,
  input[type='search'],
  button,
  .results label {
    padding: 9px 10px;
    font: inherit;
    color: $color-text;
  }
  summary,
  input[type='search'] {
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;
    min-height: 40px;
  }
  summary {
    cursor: pointer;
    overflow-wrap: anywhere;
  }
  .choices {
    display: grid;
    gap: 6px;
    padding-top: 6px;
  }
  input[type='search'] {
    width: 100%;
    min-width: 0;
  }
  .results {
    display: grid;
    max-height: 210px;
    overflow-y: auto;
  }
  button {
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface-2;
    cursor: pointer;
    text-align: left;
  }
  .results button {
    border: 0;
    background: $color-surface;
  }
  .results label {
    display: flex;
    gap: 8px;
    align-items: center;
    cursor: pointer;
  }
  .results button:hover,
  .results label:hover {
    background: $color-accent-dim;
  }
  .selected {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }
  .chip {
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 0.85rem;
  }
  p {
    color: $color-danger;
  }
  :is(button, summary, input):focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
</style>
