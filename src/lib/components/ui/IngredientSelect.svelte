<script lang="ts">
  import MultiSelect from 'svelte-multiselect'
  import { createIngredient } from '$lib/api/ingredients'
  import {
    matchIngredient,
    ingredientDisplayName,
    ingredientNames,
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
  let error = $state('')
  const toOption = (ingredient: IngredientOption) => ({
    label: ingredientDisplayName(ingredient, locale()),
    ingredient,
  })
  let all = $derived([
    ...options,
    ...custom.filter(
      (item) => !options.some((option) => option.id === item.id),
    ),
  ])
  let choices = $derived(all.map(toOption))
  let selected = $derived(
    choices.filter(({ ingredient }) =>
      multiple
        ? selectedIds.includes(ingredient.id)
        : ingredient.id === ingredientId,
    ),
  )

  async function addCustom({ option }: { option: unknown }) {
    const query = String(
      typeof option === 'object' && option !== null && 'label' in option
        ? option.label
        : option,
    ).trim()
    if (!query) return false as const
    error = ''
    try {
      const ingredient =
        matchIngredient(query, all) ?? (await createIngredient(query))
      if (!all.some((item) => item.id === ingredient.id))
        custom = [...custom, ingredient]
      return toOption(ingredient)
    } catch (cause) {
      error = message(cause instanceof Error ? cause.message : 'Request failed')
      return false as const
    }
  }
</script>

<div class="ingredient-picker">
  <MultiSelect
    options={choices}
    bind:selected
    maxSelect={multiple ? null : 1}
    minSelect={multiple ? 0 : 1}
    selectedDisplay={multiple ? 'chips' : 'input'}
    expandIconPosition="right"
    keepSelectedInDropdown="plain"
    closeDropdownOnSelect
    resetFilterOnAdd
    selectedOptionsDraggable={false}
    maxSelectMsg={null}
    removeAllTitle={t('Remove ingredient')}
    removeBtnTitle={`${t('Remove ingredient')}:`}
    placeholder={multiple ? t('Always on hand') : name || t('Ingredient')}
    inputProps={{
      'aria-label':
        locale() === 'cs' ? 'Hledat suroviny' : 'Search ingredients',
    }}
    key={(option) => option.ingredient?.id ?? option.label}
    filterFunc={(option, query) =>
      ingredientNames(option.ingredient).some((value) =>
        normalizeIngredientName(value).includes(normalizeIngredientName(query)),
      )}
    allowUserOptions
    createOptionMsg={({ searchText }) =>
      `${locale() === 'cs' ? 'Přidat vlastní surovinu' : 'Add custom ingredient'}: ${searchText.trim()}`}
    noMatchingOptionsMsg={locale() === 'cs'
      ? 'Žádné suroviny'
      : 'No ingredients found'}
    oncreate={addCustom}
    onchange={() => {
      if (multiple) {
        selectedIds = selected.map(({ ingredient }) => ingredient.id)
        onchange?.()
      } else if (selected[0]) {
        onselect?.(selected[0].ingredient, selected[0].label)
      }
    }}
  >
    {#snippet expandIcon()}
      <svg
        class="chevrons"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m8 9 4-4 4 4m-8 6 4 4 4-4" />
      </svg>
    {/snippet}
    {#snippet option({ option, selected })}
      <span class="option-label">{option.label}</span>
      <svg
        class="check"
        class:checked={selected}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    {/snippet}
    {#snippet removeIcon()}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="m6 6 12 12M6 18 18 6" />
      </svg>
    {/snippet}
  </MultiSelect>
  {#if error}<p role="alert">{error}</p>{/if}
</div>

<style lang="scss">
  .ingredient-picker {
    min-width: 0;
    --sms-min-height: 42px;
    --sms-border: 1px solid #{$color-border};
    --sms-border-radius: 6px;
    --sms-bg: #{$color-surface};
    --sms-text-color: #{$color-text};
    --sms-options-bg: #{$color-surface};
    --sms-selected-bg: #{rgba($color-text, 0.05)};
    --sms-li-active-bg: #{rgba($color-text, 0.05)};
    --sms-active-color: #{$color-text-muted};
    --sms-focus-border: 1px solid #{$color-text-muted};
    --sms-font-size: 0.875rem;
    --sms-placeholder-color: #{$color-text-muted};
    --sms-padding: 5px 12px;
    --sms-options-border: 1px solid #{$color-border};
    --sms-options-border-radius: 8px;
    --sms-options-padding: 4px;
    --sms-options-margin: 5px 0 0;
    --sms-options-max-height: 260px;
    --sms-options-shadow:
      0 4px 6px -1px rgb(0 0 0 / 8%), 0 2px 4px -2px rgb(0 0 0 / 8%);
    --sms-options-li-padding: 7px 8px;
    --sms-li-selected-plain-bg: transparent;
    --sms-li-selected-plain-border: 0;
    --sms-selected-li-padding: 2px 6px;
    --sms-remove-btn-hover-bg: #{rgba($color-text, 0.08)};

    :global(.multiselect) {
      gap: 8px;
      box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    :global(.multiselect:focus-within) {
      box-shadow: 0 0 0 3px rgba($color-text-muted, 0.12);
    }
    :global(ul.selected) {
      min-width: 0;
      gap: 4px;
      align-items: center;
    }
    :global(ul.selected > li) {
      min-height: 24px;
      max-width: 100%;
      margin: 0;
      border: 1px solid rgba($color-text, 0.08);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    :global(ul.selected > input) {
      min-height: 28px;
      text-overflow: ellipsis;
    }
    :global(ul.selected > input::placeholder) {
      padding: 0;
    }
    :global(ul.selected > input:focus-visible) {
      outline: none;
    }
    :global(button) {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      color: $color-text-muted;
    }
    :global(button:focus-visible) {
      outline: 2px solid $color-text-muted;
      outline-offset: 2px;
    }
    :global(ul.options) {
      width: max(100%, min(18rem, calc(100vw - 2rem)));
    }
    :global(ul.options.hidden) {
      transform: translateY(-4px);
    }
    :global(ul.options > li) {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 34px;
      border: 0;
      border-radius: 4px;
      line-height: 1.4;
    }
    :global(ul.options > li.user-msg) {
      color: $color-text-muted;
      font-size: 0.8125rem;
    }
  }
  .chevrons {
    color: $color-text-muted;
    flex-shrink: 0;
    opacity: 0.65;
  }
  .option-label {
    flex: 1;
    overflow-wrap: anywhere;
  }
  .check {
    flex-shrink: 0;
    opacity: 0;
    &.checked {
      opacity: 1;
    }
  }
  p {
    color: $color-danger;
  }
</style>
