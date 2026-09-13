<script lang="ts">
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import { useI18n } from '$lib/i18n-context'
  import { ingredientDisplayName } from '$lib/domain/ingredients'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  let { data }: { data: PageData } = $props()
  const { t, locale } = useI18n()
  const pageUrl = (page: number) =>
    `/admin/ingredients?${new URLSearchParams({ q: data.query, page: String(page) })}`
</script>

<div class="page">
  <header>
    <div>
      <p class="eyebrow">{t('Administration')}</p>
      <h1>{t('Ingredient catalogue')}</h1>
      <p>{t('Manage shared ingredient names, translations and aliases.')}</p>
    </div>
    <a class="add" href="/admin/ingredients/new">{t('Add ingredient')}</a>
  </header>
  <form
    role="search"
    onsubmit={(event) => {
      event.preventDefault()
      void goto(
        `/admin/ingredients?${new URLSearchParams({ q: String(new FormData(event.currentTarget).get('q') ?? '') })}`,
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
  <ul class="ingredients">
    {#each data.ingredients as ingredient (ingredient.id)}
      <li>
        <a href={`/admin/ingredients/${ingredient.id}`}
          ><span
            ><strong>{ingredientDisplayName(ingredient, locale())}</strong
            ><small>{ingredient.name}</small></span
          ><span class="languages"
            >{Object.keys(ingredient.translations).join(' · ') || '—'}
            <span aria-hidden="true">→</span></span
          ></a
        >
      </li>
    {:else}<li class="empty">{t('No ingredients found')}</li>{/each}
  </ul>
  <nav aria-label={t('Pagination')}>
    {#if data.page > 1}<a href={pageUrl(data.page - 1)}>{t('Previous')}</a>{/if}
    <span>{data.page}</span>
    {#if data.hasMore}<a href={pageUrl(data.page + 1)}>{t('Next')}</a>{/if}
  </nav>
</div>

<style lang="scss">
  .page {
    display: grid;
    gap: 1.25rem;
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
  .ingredients {
    list-style: none;
    border: 1px solid $color-border;
    border-radius: 10px;
    overflow: hidden;
    background: $color-surface;
  }
  li + li {
    border-top: 1px solid rgba($color-border, 0.5);
  }
  li a {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.8rem 1rem;
    text-decoration: none;
  }
  li a:hover {
    background: rgba($color-text, 0.03);
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
  .empty {
    padding: 1rem;
  }
  nav {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
  }
</style>
