<script lang="ts">
  import { page } from '$app/stores'
  import type { PageData } from './$types'
  import { queueCatalogue, reviewCatalogueRecipe } from '$lib/api/catalogue'
  import { deleteMeal } from '$lib/api/meals'
  import Button from '$lib/components/ui/Button.svelte'
  import Table from '$lib/components/ui/Table.svelte'
  import { useI18n } from '$lib/i18n-context'

  let { data }: { data: PageData } = $props()
  const { t, label, message: translateMessage } = useI18n()
  let imports = $derived(data.imports)
  let recipes = $derived(data.recipes)
  let payload = $state('')
  let message = $state('')
  let recipeError = $state('')
  let busy = $state(false)
  let archiveBusy = $state(false)
  const tab = $derived(
    $page.url.searchParams.get('tab') === 'imports' ? 'imports' : 'recipes',
  )

  async function queue() {
    message = ''
    busy = true
    try {
      const parsed = JSON.parse(payload)
      const result = await queueCatalogue(parsed)
      message = t(
        '{accepted} queued, {duplicates} duplicates, {invalid} invalid.',
        {
          accepted: result.accepted,
          duplicates: result.duplicates,
          invalid: result.errors.length,
        },
      )
      if (result.accepted) location.reload()
    } catch (cause) {
      message =
        cause instanceof Error
          ? translateMessage(cause.message)
          : t('Import failed')
    } finally {
      busy = false
    }
  }

  async function review(id: number, status: 'approved' | 'rejected') {
    await reviewCatalogueRecipe(id, status)
    imports = imports.filter((entry) => entry.id !== id)
  }

  async function archive(id: number) {
    if (archiveBusy) return
    if (!confirm(t('Archive this shared recipe?'))) return
    recipeError = ''
    archiveBusy = true
    try {
      await deleteMeal(id)
      recipes = recipes.filter((recipe) => recipe.id !== id)
    } catch (cause) {
      recipeError =
        cause instanceof Error
          ? translateMessage(cause.message)
          : t('Request failed')
    } finally {
      archiveBusy = false
    }
  }
</script>

{#snippet recipeRow(recipe: (typeof recipes)[number])}
  <tr>
    <td><a class="recipe-link" href="/meals/{recipe.id}">{recipe.name}</a></td>
    <td>{recipe.sourceLocale.toUpperCase()}</td>
    <td>{recipe.difficulty ? label(recipe.difficulty) : '—'}</td>
    <td class="actions">
      <a class="edit-link" href="/meals/{recipe.id}?edit=1">{t('Edit')}</a>
      <Button
        size="sm"
        variant="danger"
        disabled={archiveBusy}
        onclick={() => archive(recipe.id)}>{t('Archive')}</Button
      >
    </td>
  </tr>
{/snippet}

<div class="page">
  <div>
    <p class="eyebrow">{t('Global catalogue')}</p>
    <h1>{t('Recipe management')}</h1>
    <p class="subtitle">
      {t('Manage shared recipes and review imported recipe data.')}
    </p>
  </div>

  <nav class="tabs" aria-label={t('Admin recipe sections')}>
    <a
      href="/admin/recipes"
      aria-current={tab === 'recipes' ? 'page' : undefined}
      >{t('Shared recipes')}</a
    >
    <a
      href="/admin/recipes?tab=imports"
      aria-current={tab === 'imports' ? 'page' : undefined}
      >{t('Imports & approvals')}</a
    >
  </nav>

  {#if tab === 'recipes'}
    <section>
      <div class="section-heading">
        <h2>{t('Shared recipes')}</h2>
        <a class="edit-link" href="/meals">{t('Open recipe library')}</a>
      </div>
      {#if recipeError}<p class="error" role="alert">{recipeError}</p>{/if}
      <div class="table-wrap">
        <Table
          data={recipes}
          columns={[t('Name'), t('Language'), t('Difficulty'), t('Actions')]}
          row={recipeRow}
          emptyMessage={t('No shared recipes.')}
        />
      </div>
    </section>
  {:else}
    <section>
      <h2>{t('Batch import')}</h2>
      <p>
        {t(
          'Paste a JSON array of 1–300 recipes. Each needs a name, ingredients, and instructions.',
        )}
      </p>
      <textarea
        bind:value={payload}
        rows="8"
        placeholder={t('Paste recipe JSON here')}></textarea>
      <div class="submit">
        <Button onclick={queue} disabled={busy || !payload.trim()}>
          {busy ? t('Validating…') : t('Queue recipes')}
        </Button>
        {#if message}<span>{message}</span>{/if}
      </div>
    </section>

    <section>
      <h2>{t('Pending ({count})', { count: imports.length })}</h2>
      {#if imports.length}
        <div class="queue">
          {#each imports as entry}
            <article>
              <div>
                <h3>{String(entry.recipe.name)}</h3>
                <details>
                  <summary>{t('Review content')}</summary>
                  {#if entry.recipe.description}
                    <p>{String(entry.recipe.description)}</p>
                  {/if}
                  <h4>{t('Ingredients')}</h4>
                  <ul>
                    {#each entry.recipe.ingredients as ingredient}
                      <li>
                        {ingredient.qty ?? ''}
                        {ingredient.unit ?? ''}
                        {ingredient.name}
                      </li>
                    {/each}
                  </ul>
                  <h4>{t('Instructions')}</h4>
                  <p class="instructions">
                    {String(entry.recipe.instructions)}
                  </p>
                </details>
              </div>
              <div class="actions">
                <Button size="sm" onclick={() => review(entry.id, 'approved')}
                  >{t('Approve')}</Button
                >
                <Button
                  size="sm"
                  variant="danger"
                  onclick={() => review(entry.id, 'rejected')}
                  >{t('Reject')}</Button
                >
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <p>{t('No recipes awaiting review.')}</p>
      {/if}
    </section>
  {/if}
</div>

<style lang="scss">
  .page,
  section,
  .queue {
    display: grid;
    gap: 1rem;
  }
  .eyebrow {
    color: $color-accent;
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: uppercase;
  }
  h1 {
    font-family: Georgia, serif;
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 500;
  }
  h2,
  h3 {
    font-family: Georgia, serif;
    font-weight: 500;
  }
  .subtitle,
  section > p,
  .submit span {
    color: $color-text-muted;
  }
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface-2;
  }
  .tabs a {
    padding: 8px 14px;
    border-radius: calc($radius-sm - 3px);
    color: $color-text-muted;
    font-size: 0.85rem;
    font-weight: 650;
    text-decoration: none;
  }
  .tabs a[aria-current='page'] {
    background: $color-surface;
    box-shadow: 0 2px 8px rgb(41 39 33 / 8%);
    color: $color-text;
  }
  section {
    padding: 1.25rem;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    font: 0.8rem monospace;
  }
  .submit,
  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .table-wrap {
    overflow: hidden;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
  }
  .recipe-link {
    color: $color-text;
    font-weight: 650;
    text-decoration: none;
  }
  .edit-link {
    color: $color-accent;
    font-size: 0.85rem;
  }
  .error {
    color: $color-danger;
  }
  td.actions {
    width: 11rem;
    min-width: 11rem;
    white-space: nowrap;
  }
  article {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid $color-border;
  }
  article > div:first-child {
    display: grid;
    gap: 0.25rem;
  }
  details {
    margin-top: 0.5rem;
  }
  summary {
    cursor: pointer;
    color: $color-accent;
  }
  h4 {
    margin-top: 0.75rem;
  }
  ul {
    padding-left: 1.25rem;
  }
  .instructions {
    white-space: pre-wrap;
  }
</style>
