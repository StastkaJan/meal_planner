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
  />
  {#if error}<p role="alert">{error}</p>{/if}
</div>

<style lang="scss">
  .ingredient-picker {
    min-width: 0;
    --sms-min-height: 42px;
    --sms-border: 1px solid #{$color-border-strong};
    --sms-border-radius: #{$radius-sm};
    --sms-bg: #{$color-surface};
    --sms-text-color: #{$color-text};
    --sms-options-bg: #{$color-surface};
    --sms-selected-bg: #{$color-surface-2};
    --sms-li-active-bg: #{$color-accent-dim};
    --sms-active-color: #{$color-accent};
    --sms-padding: 4px 10px;
  }
  p {
    color: $color-danger;
  }
</style>
