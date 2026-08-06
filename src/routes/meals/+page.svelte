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
  import MealsTable from './_components/MealsTable.svelte'

  let { data }: { data: PageData } = $props()
  let meals = $derived(data.meals)
  let creating = $state(false)
  let importing = $state(false)
  let importUrl = $state('')
  let importError = $state('')
  let importBusy = $state(false)

  async function handleCreate(
    name: FormDataEntryValue | null,
    scope: FormDataEntryValue | null,
  ) {
    const created = await createMeal({ name, scope })
    if (!data.favoritesOnly)
      meals = [...meals, { ...created, isFavorite: false }].sort((a, b) =>
        a.name.localeCompare(b.name),
      )
    creating = false
  }

  async function deleteMeal(id: number) {
    if (!confirm('Delete this meal?')) return
    await removeMeal(id)
    meals = meals.filter((meal) => meal.id !== id)
  }

  async function toggleFavorite(id: number, next: boolean) {
    await setFavorite(id, next)
    meals = meals.map((meal) =>
      meal.id === id ? { ...meal, isFavorite: next } : meal,
    )
  }

  function toggleFavoritesFilter() {
    goto(data.favoritesOnly ? '/meals' : '/meals?favorites=1', {
      noScroll: true,
      keepFocus: true,
    })
  }

  async function importRecipe() {
    if (!importUrl.trim() || importBusy) return
    importError = ''
    importBusy = true
    try {
      const fields = await fetchRecipe(importUrl.trim())
      const ingredients = (
        (fields.ingredients as string[] | undefined) ?? []
      ).map((name) => ({ name, qty: null, unit: null }))
      const created = await createMeal({
        ...fields,
        ingredients,
        scope: 'personal',
      })
      await goto(`/meals/${created.id}`)
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Import failed'
    } finally {
      importBusy = false
    }
  }
</script>

<div class="page">
  <div class="top-bar">
    <div>
      <p class="eyebrow">Recipe library</p>
      <h1>Recipes</h1>
      <p class="subtitle">Keep your favourites ready for the week ahead.</p>
    </div>
    <div class="top-actions">
      <Button
        variant="secondary"
        class={data.favoritesOnly ? 'active' : ''}
        onclick={toggleFavoritesFilter}
      >
        {data.favoritesOnly ? 'Show all' : 'Favourites only'}
      </Button>
      <Button
        variant="secondary"
        onclick={() => {
          importing = !importing
          importError = ''
        }}>Import from URL</Button
      >
      <Button onclick={() => (creating = true)}>+ Add meal</Button>
    </div>
  </div>

  {#if importing}
    <div class="import-bar">
      <Input
        type="url"
        placeholder="https://…recipe page URL"
        bind:value={importUrl}
        onkeydown={(event) => {
          if (event.key === 'Enter') importRecipe()
        }}
      />
      <Button size="sm" onclick={importRecipe} disabled={importBusy}>
        {importBusy ? 'Importing…' : 'Import'}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onclick={() => {
          importing = false
          importError = ''
        }}>Cancel</Button
      >
      {#if importError}<span class="import-error">{importError}</span>{/if}
    </div>
  {/if}

  <MealsTable
    {meals}
    bind:creating
    emptyMessage={data.favoritesOnly ? 'No favourites yet.' : 'No meals yet.'}
    onCreate={handleCreate}
    onDelete={deleteMeal}
    onFavorite={toggleFavorite}
  />
</div>

<style lang="scss">
  .page {
    display: grid;
    gap: 1.4rem;
  }

  .top-bar,
  .top-actions,
  .import-bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
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

  .import-bar {
    padding: 0.8rem;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 8px 24px rgb(41 39 33 / 4%);
  }

  .import-bar :global(.ui-input) {
    flex: 1;
  }

  .import-error {
    color: $color-danger;
    font-size: 0.8rem;
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
    .import-bar {
      align-items: stretch;
      flex-wrap: wrap;
    }
    .import-bar :global(.ui-input) {
      flex-basis: 100%;
    }
  }
</style>
