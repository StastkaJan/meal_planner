<script lang="ts">
  import { goto } from '$app/navigation'
  import type { PageData } from './$types'
  import {
    createMeal,
    deleteMeal as removeMeal,
    importRecipe as fetchRecipe,
    setFavorite,
  } from '$lib/api/meals'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import MealsTable from './_components/MealsTable.svelte'
  import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '$lib/i18n'
  import { useI18n } from '$lib/i18n-context'

  let { data }: { data: PageData } = $props()
  const { t, message, label, namedCount } = useI18n()
  let meals = $derived(data.meals)
  let creating = $state(false)
  let importing = $state(false)
  let importUrl = $state('')
  let importError = $state('')
  let deleteError = $state('')
  let importBusy = $state(false)
  let importLocale = $derived<Locale>(data.locale)

  async function handleCreate(
    name: FormDataEntryValue | null,
    scope: FormDataEntryValue | null,
  ) {
    const created = await createMeal({ name, scope, sourceLocale: data.locale })
    if (!data.favoritesOnly)
      meals = [...meals, { ...created, isFavorite: false }].sort((a, b) =>
        a.name.localeCompare(b.name),
      )
    creating = false
  }

  async function deleteMeal(id: number) {
    if (!confirm(t('Delete this meal?'))) return
    deleteError = ''
    try {
      await removeMeal(id)
      meals = meals.filter((meal) => meal.id !== id)
    } catch (cause) {
      deleteError =
        cause instanceof Error ? message(cause.message) : t('Request failed')
    }
  }

  async function toggleFavorite(id: number, next: boolean) {
    await setFavorite(id, next)
    meals = meals.map((meal) =>
      meal.id === id ? { ...meal, isFavorite: next } : meal,
    )
  }

  function toggleFavoritesFilter() {
    goto(recipeUrl({ favorites: data.favoritesOnly ? false : true, page: 1 }), {
      noScroll: true,
      keepFocus: true,
    })
  }

  function recipeUrl(
    patch: { favorites?: boolean; page?: number; clear?: boolean } = {},
  ) {
    const params = new URLSearchParams()
    if (!patch.clear && data.query) params.set('q', data.query)
    if (!patch.clear && data.difficulty)
      params.set('difficulty', data.difficulty)
    if (patch.favorites ?? data.favoritesOnly) params.set('favorites', '1')
    const page = patch.page ?? data.page
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    return query ? `/meals?${query}` : '/meals'
  }

  async function importRecipe() {
    if (!importUrl.trim() || importBusy) return
    importError = ''
    importBusy = true
    try {
      const fields = await fetchRecipe(importUrl.trim())
      const created = await createMeal({
        ...fields,
        ingredients: fields.ingredients ?? [],
        scope: 'personal',
        sourceLocale: importLocale,
      })
      await goto(`/meals/${created.id}?edit=1`)
    } catch (error) {
      importError =
        error instanceof Error ? message(error.message) : t('Import failed')
    } finally {
      importBusy = false
    }
  }
</script>

<div class="page">
  <div class="top-bar">
    <div>
      <p class="eyebrow">{t('Recipe library')}</p>
      <h1>{t('Recipes')}</h1>
      <p class="subtitle">
        {t('Keep your favourites ready for the week ahead.')}
      </p>
    </div>
    <div class="top-actions">
      <Button
        variant="secondary"
        class={data.favoritesOnly ? 'active' : ''}
        onclick={toggleFavoritesFilter}
      >
        {data.favoritesOnly ? t('Show all') : t('Favourites only')}
      </Button>
      <Button
        variant="secondary"
        disabled={!data.user?.isPro}
        title={!data.user?.isPro ? t('Pro subscription required') : undefined}
        onclick={() => {
          importing = !importing
          importError = ''
        }}
        >{t('Import from URL')}{#if !data.user?.isPro}
          · {t('Pro')}{/if}</Button
      >
      <Button onclick={() => (creating = true)}>{t('+ Add meal')}</Button>
    </div>
  </div>

  {#if importing}
    <form
      class="import-panel"
      onsubmit={(event) => {
        event.preventDefault()
        importRecipe()
      }}
    >
      <div>
        <h2>{t('Import a recipe')}</h2>
        <p>
          {t(
            'Paste a public recipe page URL. The personal recipe opens for editing after import.',
          )}
        </p>
      </div>
      <div class="import-fields">
        <label class="url-field">
          <span>{t('Recipe page URL')}</span>
          <Input
            type="url"
            placeholder="https://example.com/recipe"
            bind:value={importUrl}
            required
          />
        </label>
        <label>
          <span>{t('Recipe language')}</span>
          <Select
            value={importLocale}
            onchange={(event) =>
              (importLocale = (event.currentTarget as HTMLSelectElement)
                .value as Locale)}
            options={SUPPORTED_LOCALES.map((locale) => ({
              value: locale,
              label: LOCALE_LABELS[locale],
            }))}
          />
        </label>
      </div>
      {#if importError}<p class="import-error" role="alert">
          {importError}
        </p>{/if}
      <div class="import-actions">
        <Button type="submit" disabled={importBusy}>
          {importBusy ? t('Importing…') : t('Import and edit')}
        </Button>
        <Button
          variant="secondary"
          onclick={() => {
            importing = false
            importError = ''
          }}>{t('Cancel')}</Button
        >
      </div>
    </form>
  {/if}

  <form class="filters" method="GET">
    <Input
      type="search"
      name="q"
      value={data.query}
      placeholder={t('Search recipes…')}
    />
    <Select
      name="difficulty"
      value={data.difficulty}
      title={t('Filter by difficulty')}
      options={[
        { value: '', label: t('Any difficulty') },
        { value: 'easy', label: label('easy') },
        { value: 'medium', label: label('medium') },
        { value: 'hard', label: label('hard') },
      ]}
    />
    {#if data.favoritesOnly}<input
        type="hidden"
        name="favorites"
        value="1"
      />{/if}
    <Button type="submit" size="sm">{t('Apply')}</Button>
    {#if data.query || data.difficulty}
      <a class="clear" href={recipeUrl({ clear: true, page: 1 })}
        >{t('Clear')}</a
      >
    {/if}
    <span class="result-count">{namedCount(data.totalResults, 'recipe')}</span>
  </form>

  {#if deleteError}<p class="delete-error" role="alert">{deleteError}</p>{/if}
  <MealsTable
    {meals}
    isAdmin={data.isAdmin}
    bind:creating
    emptyMessage={data.query || data.difficulty
      ? t('No matching recipes.')
      : data.favoritesOnly
        ? t('No favourites yet.')
        : t('No meals yet.')}
    onCreate={handleCreate}
    onDelete={deleteMeal}
    onFavorite={toggleFavorite}
  />
  {#if data.totalPages > 1}
    <nav class="pagination" aria-label={t('Recipe pages')}>
      {#if data.page > 1}<a href={recipeUrl({ page: data.page - 1 })}
          >{t('Previous')}</a
        >{/if}
      <span
        >{t('Page {page} of {pages}', {
          page: data.page,
          pages: data.totalPages,
        })}</span
      >
      {#if data.page < data.totalPages}<a
          href={recipeUrl({ page: data.page + 1 })}>{t('Next')}</a
        >{/if}
    </nav>
  {/if}
</div>

<style lang="scss">
  .page {
    display: grid;
    gap: 1.4rem;
  }

  .top-bar,
  .top-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) 11rem auto auto 1fr;
    gap: 0.5rem;
    align-items: center;
  }
  .clear {
    color: $color-text-muted;
    font-size: 0.85rem;
  }
  .result-count {
    justify-self: end;
    color: $color-text-muted;
    font-size: 0.8rem;
  }
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    color: $color-text-muted;
    font-size: 0.85rem;

    a {
      color: $color-accent;
    }
  }

  .top-bar {
    justify-content: space-between;
    align-items: flex-end;
  }

  .eyebrow {
    margin-bottom: 4px;
    color: $color-accent;
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }

  .subtitle {
    margin-top: 8px;
    color: $color-text-muted;
    font-size: 0.95rem;
  }

  .top-actions :global(.active) {
    border-color: $color-accent;
    color: $color-accent;
  }

  .import-panel {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 8px 24px rgb(41 39 33 / 4%);
  }
  .import-panel h2 {
    margin-bottom: 0.2rem;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.3rem;
    font-weight: 500;
  }
  .import-panel p,
  .import-panel label span {
    color: $color-text-muted;
    font-size: 0.83rem;
  }
  .import-fields {
    display: grid;
    grid-template-columns: minmax(16rem, 1fr) 12rem;
    gap: 0.75rem;
  }
  .import-fields label {
    display: grid;
    gap: 0.35rem;
  }
  .import-actions {
    display: flex;
    gap: 0.5rem;
  }

  .import-error {
    color: $color-danger;
    font-size: 0.8rem;
  }
  .delete-error {
    color: $color-danger;
  }

  @media (max-width: 720px) {
    .top-bar {
      align-items: flex-start;
      flex-direction: column;
    }
    .top-actions {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .top-actions :global(.ui-button) {
      flex: 0 0 auto;
    }
    .import-fields {
      grid-template-columns: 1fr;
    }
    .filters {
      grid-template-columns: 1fr 1fr;
    }
    .filters :global(.ui-input) {
      grid-column: 1 / -1;
    }
    .result-count {
      justify-self: end;
    }
  }
</style>
