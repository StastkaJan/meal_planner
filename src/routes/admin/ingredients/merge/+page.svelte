<script lang="ts">
  import { goto } from '$app/navigation'
  import type { PageData } from './$types'
  import { mergeCatalogueIngredients } from '$lib/api/ingredients'
  import { useI18n } from '$lib/i18n-context'
  import IngredientSelect from '$lib/components/ui/IngredientSelect.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'

  let { data }: { data: PageData } = $props()
  const { t, message } = useI18n()
  let sourceId = $derived<number | undefined>(data.sources[0]?.id)
  let targetId = $state<number>()
  let busy = $state(false)
  let failure = $state('')
  let source = $derived(data.sources.find((row) => row.id === sourceId))
  let target = $derived(data.targets.find((row) => row.id === targetId))

  async function merge(event: SubmitEvent) {
    event.preventDefault()
    if (busy || !source || !target || source.id === target.id) return
    if (
      !confirm(
        t(
          'Merge {source} into {target} for all users? This cannot be undone in the app.',
          {
            source: source.name,
            target: target.name,
          },
        ),
      )
    )
      return
    busy = true
    failure = ''
    try {
      const result = await mergeCatalogueIngredients(source.id, target.id)
      await goto(`/admin/ingredients/${result.id}`)
    } catch (cause) {
      failure = message(
        cause instanceof Error ? cause.message : 'Request failed',
      )
    } finally {
      busy = false
    }
  }
</script>

<div class="page">
  <a href="/admin/ingredients">← {t('Ingredient catalogue')}</a>
  <h1>{t('Merge ingredients')}</h1>
  <p>
    {t(
      'Replace a duplicate ingredient in all recipes and pantry selections. Its names and aliases will point to the selected catalogue ingredient. Quantities and original recipe text stay unchanged.',
    )}
  </p>
  <form
    role="search"
    onsubmit={(event) => {
      event.preventDefault()
      void goto(
        `/admin/ingredients/merge?${new URLSearchParams({ q: String(new FormData(event.currentTarget).get('q') ?? '') })}`,
      )
    }}
  >
    <Input
      name="q"
      value={data.query}
      aria-label={t('Search duplicate ingredients')}
      maxlength={100}
    />
    <Button type="submit" variant="secondary" disabled={busy}
      >{t('Search')}</Button
    >
  </form>
  <form onsubmit={merge}>
    <fieldset disabled={busy}>
      <p>{t('Duplicate ingredient')}</p>
      <IngredientSelect
        options={data.sources}
        ingredientId={sourceId}
        allowCreate={false}
        showIdentity
        label={t('Duplicate ingredient')}
        onselect={(row) => (sourceId = row?.id)}
      />
      <p class="hint">
        {t(
          'Includes custom ingredients. Showing up to 30 matches; refine your search if needed.',
        )}
      </p>
      {#if !data.sources.length}<p>{t('No ingredients found')}</p>{/if}
      <p>{t('Merge into')}</p>
      <IngredientSelect
        options={data.targets.filter((row) => row.id !== sourceId)}
        ingredientId={targetId}
        allowCreate={false}
        showIdentity
        label={t('Merge into')}
        onselect={(row) => (targetId = row?.id)}
      />
      {#if source && target && source.id !== target.id}
        <p class="preview">
          <strong>{source.name}</strong> → <strong>{target.name}</strong>
        </p>
      {/if}
      {#if failure}<p class="error" role="alert">{failure}</p>{/if}
      <Button
        type="submit"
        disabled={!source || !target || source.id === target.id}
      >
        {busy ? t('Saving') : t('Merge ingredients')}
      </Button>
    </fieldset>
  </form>
</div>

<style lang="scss">
  .page,
  fieldset {
    display: grid;
    gap: 1rem;
  }
  .page {
    max-width: 720px;
  }
  h1 {
    font:
      500 clamp(2rem, 4vw, 3rem) Georgia,
      serif;
  }
  form[role='search'] {
    display: flex;
    gap: 0.5rem;
  }
  fieldset {
    border: 0;
    min-width: 0;
  }
  .hint {
    color: $color-text-muted;
    font-size: 0.875rem;
  }
  .preview {
    overflow-wrap: anywhere;
  }
  .error {
    color: $color-danger;
  }
</style>
