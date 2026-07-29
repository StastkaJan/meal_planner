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
    await createMeal({ name, scope })
    creating = false
    await goto('/meals')
  }

  async function deleteMeal(id: number) {
    if (!confirm('Delete this meal?')) return
    await removeMeal(id)
    await goto('/meals')
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
    <h2>Meals</h2>
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
    gap: 1rem;
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
  }

  h2 {
    font-size: 1.2rem;
  }

  .top-actions :global(.active) {
    border-color: $color-accent;
    color: $color-accent;
  }

  .import-bar {
    padding: 0.65rem;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }

  .import-bar :global(.ui-input) {
    flex: 1;
  }

  .import-error {
    color: $color-danger;
    font-size: 0.8rem;
  }
</style>
