<script lang="ts">
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import { saveCatalogueIngredient } from '$lib/api/ingredients'
  import { useI18n } from '$lib/i18n-context'
  import Input from '$lib/components/ui/Input.svelte'
  import Textarea from '$lib/components/ui/Textarea.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  let { data }: { data: PageData } = $props()
  const { t, message } = useI18n()
  let ingredient = $derived(data.ingredient)
  let rows = $derived(
    ingredient
      ? Object.entries(ingredient.translations).map(([locale, value]) => ({
          locale,
          name: value.name,
          aliases: value.aliases.join('\n'),
        }))
      : [
          { locale: 'en', name: '', aliases: '' },
          { locale: 'cs', name: '', aliases: '' },
        ],
  )
  let busy = $state(false)
  let failure = $state('')
  let saved = $state(false)

  function updateRow(
    index: number,
    field: 'locale' | 'name' | 'aliases',
    value: string,
  ) {
    rows = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    )
  }

  async function save(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault()
    if (busy) return
    busy = true
    failure = ''
    saved = false
    const fields = new FormData(event.currentTarget)
    try {
      const updated = await saveCatalogueIngredient(
        {
          name: String(fields.get('name') ?? ''),
          translations: rows
            .map((_, i) => ({
              locale: String(fields.get(`locale-${i}`) ?? ''),
              name: String(fields.get(`name-${i}`) ?? ''),
              aliases: String(fields.get(`aliases-${i}`) ?? '')
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean),
            }))
            .filter((row) => row.name.trim() || row.aliases.length),
        },
        ingredient?.id,
      )
      if (!ingredient) await goto(`/admin/ingredients/${updated.id}`)
      ingredient = updated
      saved = true
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
  <header>
    <p class="eyebrow">{t('Administration')}</p>
    <h1>{ingredient ? t('Edit ingredient') : t('Add ingredient')}</h1>
    <p>
      {t(
        'Translations and aliases are shared by recipes, shopping lists and pantry staples.',
      )}
    </p>
  </header>
  <form onsubmit={save} oninput={() => (saved = false)}>
    <fieldset disabled={busy}>
      <label
        >{t('Original name')}<Input
          name="name"
          value={ingredient?.name ?? ''}
          required
          maxlength={100}
        /></label
      >
      <h2>{t('Translations and aliases')}</h2>
      <p class="hint">
        {t(
          'Use a language code such as en, cs or de. Enter one alias per line. Blank translations use the original name.',
        )}
      </p>
      {#each rows as row, i}
        <section aria-label={`${t('Translation')} ${row.locale || i + 1}`}>
          <div class="translation-heading">
            <label
              >{t('Language code')}<Input
                name={`locale-${i}`}
                value={row.locale}
                oninput={(event) =>
                  updateRow(i, 'locale', event.currentTarget.value)}
                maxlength={35}
                placeholder="cs"
              /></label
            >
            <Button
              size="sm"
              variant="secondary"
              onclick={() => {
                rows = rows.filter((_, index) => index !== i)
                saved = false
              }}>{t('Remove translation')}</Button
            >
          </div>
          <label
            >{t('Translated name')}<Input
              name={`name-${i}`}
              value={row.name}
              oninput={(event) =>
                updateRow(i, 'name', event.currentTarget.value)}
              maxlength={100}
            /></label
          >
          <label
            >{t('Aliases')}<Textarea
              name={`aliases-${i}`}
              value={row.aliases}
              oninput={(event) =>
                updateRow(i, 'aliases', event.currentTarget.value)}
              rows={3}
            /></label
          >
        </section>
      {/each}
      <Button
        variant="secondary"
        disabled={rows.length >= 20}
        onclick={() => {
          rows = [...rows, { locale: '', name: '', aliases: '' }]
          saved = false
        }}>{t('Add translation')}</Button
      >
      {#if failure}<p class="error" role="alert">{failure}</p>{/if}
      {#if saved}<p role="status">{t('Ingredient saved.')}</p>{/if}
      <div class="actions">
        <Button type="submit">{busy ? t('Saving') : t('Save')}</Button><a
          href="/admin/ingredients">{t('Cancel')}</a
        >
      </div>
    </fieldset>
  </form>
</div>

<style lang="scss">
  .page {
    max-width: 720px;
    display: grid;
    gap: 1.5rem;
  }
  h1 {
    font:
      500 clamp(2rem, 4vw, 3rem) Georgia,
      serif;
  }
  header p,
  .hint {
    color: $color-text-muted;
  }
  .eyebrow {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: $color-accent;
  }
  fieldset {
    border: 0;
    min-width: 0;
    display: grid;
    gap: 1rem;
  }
  h2 {
    margin-top: 0.5rem;
    font-size: 1.15rem;
  }
  label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.875rem;
  }
  section {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid $color-border;
    border-radius: 10px;
    background: $color-surface;
  }
  .translation-heading {
    display: flex;
    align-items: end;
    gap: 1rem;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .translation-heading label {
    max-width: 10rem;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .error {
    color: $color-danger;
  }
</style>
