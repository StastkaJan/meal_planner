<script lang="ts">
  import Table from '$lib/components/ui/Table.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import { useI18n } from '$lib/i18n-context'
  import { ingredientDisplayName } from '$lib/domain/ingredients'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  let { data }: { data: PageData } = $props()
  const { t, locale } = useI18n()
  const pageUrl = (page: number) =>
    `/admin/ingredients?${new URLSearchParams({ q: data.query, missing: data.missing ? '1' : '0', page: String(page) })}`
</script>

<div class="page">
  <header>
    <div>
      <p class="eyebrow">{t('Administration')}</p>
      <h1>{t('Ingredient catalogue')}</h1>
      <p>{t('Manage shared ingredient names, translations and aliases.')}</p>
    </div>
    <a class="add" href="/admin/ingredients/new">{t('Add ingredient')}</a>
    <a class="add" href="/admin/ingredients/merge">{t('Merge ingredients')}</a>
  </header>
  <form
    role="search"
    onsubmit={(event) => {
      event.preventDefault()
      void goto(
        `/admin/ingredients?${new URLSearchParams({ q: String(new FormData(event.currentTarget).get('q') ?? ''), missing: data.missing ? '1' : '0' })}`,
      )
    }}
  >
    <Input
      name="q"
      value={data.query}
      aria-label={t('Search ingredients')}
      placeholder={t('Search names and aliases')}
      maxlength={100}
    />
    <Button type="submit" variant="secondary">{t('Search')}</Button>
  </form>
  <label class="translation-filter">
    <input
      type="checkbox"
      checked={data.missing}
      onchange={(event) =>
        goto(
          `/admin/ingredients?${new URLSearchParams({ q: data.query, missing: event.currentTarget.checked ? '1' : '0' })}`,
        )}
    />
    {t('Missing English or Czech translation')}
  </label>
  <Table
    data={data.ingredients}
    columns={[t('Name'), t('Language')]}
    row={ingredientRow}
    emptyMessage={t('No ingredients found')}
  />
  {#snippet ingredientRow(ingredient: (typeof data.ingredients)[number])}
    <tr>
      <td
        ><a class="ingredient-link" href={`/admin/ingredients/${ingredient.id}`}
          ><strong>{ingredientDisplayName(ingredient, locale())}</strong><small
            >{ingredient.name}</small
          ></a
        ></td
      >
      <td class="languages"
        >{Object.keys(ingredient.translations).join(' / ') || '-'}</td
      >
    </tr>
  {/snippet}
  <Pagination page={data.page} totalPages={data.totalPages} href={pageUrl} />
</div>

<style lang="scss">
  .page {
    display: grid;
    gap: 1.25rem;
  }
  .translation-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: $color-text-muted;
    font-size: 0.875rem;
  }
  .translation-filter input {
    accent-color: $color-accent;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  h1 {
    font:
      500 clamp(2rem, 4vw, 3rem) Georgia,
      serif;
  }
  header p,
  small,
  .languages {
    color: $color-text-muted;
  }
  .eyebrow {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: $color-accent;
  }
  .add {
    padding: 0.6rem 1rem;
    border: 1px solid $color-border;
    border-radius: 6px;
    background: $color-surface;
    text-decoration: none;
  }
  form {
    display: flex;
    gap: 0.5rem;
  }
  strong,
  small {
    display: block;
    overflow-wrap: anywhere;
  }
  .languages {
    font-size: 0.8rem;
    text-align: right;
    overflow-wrap: anywhere;
  }
  .ingredient-link {
    color: $color-text;
    text-decoration: none;
  }
  .ingredient-link:hover {
    color: $color-accent;
  }
</style>
