<script lang="ts">
  import { deleteMealTranslation, updateMealTranslation } from '$lib/api/meals'
  import Textarea from '$lib/components/ui/Textarea.svelte'
  import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '$lib/i18n'
  import type { Meal, MealTranslation } from '$lib/database/schema'
  import { useI18n } from '$lib/i18n-context'

  const { t } = useI18n()

  let {
    meal,
    translations,
    currentLocale,
    onCancel,
    onChanged,
  }: {
    meal: Meal
    translations: MealTranslation[]
    currentLocale: Locale
    onCancel: () => void
    onChanged: (translation: MealTranslation | null, locale: Locale) => void
  } = $props()

  const targets = $derived(
    SUPPORTED_LOCALES.filter((locale) => locale !== meal.sourceLocale),
  )
  let locale = $derived<Locale>(
    currentLocale !== meal.sourceLocale ? currentLocale : targets[0],
  )
  const translation = $derived(
    translations.find((item) => item.locale === locale),
  )

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const body = Object.fromEntries(
      new FormData(event.currentTarget as HTMLFormElement),
    )
    onChanged(await updateMealTranslation(meal.id, locale, body), locale)
  }

  async function remove() {
    if (
      !confirm(
        t('Delete the {language} translation?', {
          language: LOCALE_LABELS[locale],
        }),
      )
    )
      return
    await deleteMealTranslation(meal.id, locale)
    onChanged(null, locale)
  }
</script>

<form class="translation-form" onsubmit={save}>
  <div class="form-header">
    <div>
      <p class="eyebrow">{t('Recipe translation')}</p>
      <h2>
        {t('Translate from {language}', {
          language: LOCALE_LABELS[meal.sourceLocale as Locale],
        })}
      </h2>
    </div>
    <label>
      {t('Language')}
      <select bind:value={locale}>
        {#each targets as option}
          <option value={option}>{LOCALE_LABELS[option]}</option>
        {/each}
      </select>
    </label>
  </div>

  <label>
    {t('Name')}
    <input
      name="name"
      value={translation?.name ?? ''}
      placeholder={meal.name}
    />
  </label>
  <label>
    {t('Description')}
    <Textarea
      name="description"
      rows={3}
      value={translation?.description ?? ''}
      placeholder={meal.description ?? t('No original description')}
    />
  </label>
  <label>
    {t('Instructions')}
    <Textarea
      name="instructions"
      rows={8}
      value={translation?.instructions ?? ''}
      placeholder={meal.instructions ?? t('No original instructions')}
    />
  </label>
  <p class="hint">{t('Blank fields fall back to the original recipe.')}</p>

  <div class="actions">
    <button class="btn" type="submit">{t('Save translation')}</button>
    <button class="btn ghost" type="button" onclick={onCancel}
      >{t('Cancel')}</button
    >
    {#if translation}
      <button class="btn danger remove" type="button" onclick={remove}
        >{t('Delete translation')}</button
      >
    {/if}
  </div>
</form>

<style lang="scss">
  .translation-form {
    display: grid;
    gap: 18px;
    padding: 26px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    box-shadow: 0 16px 40px rgb(41 39 33 / 6%);
  }
  .form-header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: end;
  }
  .eyebrow {
    color: $color-accent;
    font-size: 0.7rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.35rem;
    font-weight: 500;
  }
  label {
    display: grid;
    gap: 4px;
    color: $color-text-muted;
    font-size: 0.8rem;
    font-weight: 500;
  }
  input,
  select {
    min-height: 42px;
    padding: 9px 10px;
    background: $color-surface;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: 0.875rem;
  }
  .hint {
    color: $color-text-muted;
    font-size: 0.8rem;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .remove {
    margin-left: auto;
  }
  .btn {
    min-height: 38px;
    padding: 7px 14px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    &.ghost {
      background: $color-surface;
      color: $color-text-muted;
      border: 1px solid $color-border-strong;
    }
    &.danger {
      border: 1px solid rgb(184 59 50 / 18%);
      background: #f9e4e1;
      color: $color-danger;
    }
  }
  @media (max-width: 540px) {
    .form-header {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
