<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { deleteMeal as removeMeal, duplicateMeal } from '$lib/api/meals'
  import CookingMode from './_components/CookingMode.svelte'
  import MealEditForm from './_components/MealEditForm.svelte'
  import MealTranslationForm from './_components/MealTranslationForm.svelte'
  import type { PageData } from './$types'
  import { useI18n } from '$lib/i18n-context'

  let { data }: { data: PageData } = $props()
  const { t, label, namedCount } = useI18n()
  let sourceMeal = $derived(data.sourceMeal)
  let translations = $derived(data.translations)
  let meal = $derived.by(() => {
    const translation = translations.find((item) => item.locale === data.locale)
    return {
      ...sourceMeal,
      name: translation?.name ?? sourceMeal.name,
      description: translation?.description ?? sourceMeal.description,
      instructions: translation?.instructions ?? sourceMeal.instructions,
    }
  })
  let editing = $state(false)
  let translating = $state(false)
  const cooking = $derived($page.url.searchParams.get('cook') === '1')

  // Servings scaler: nutrition is stored for the recipe's own serving count; the stepper
  // rescales the displayed numbers only (ingredient text is free-form, left untouched).
  const base = $derived(meal.servings || 1)
  let servings = $derived(meal.servings || 1)
  const factor = $derived(servings / base)
  const hasNutrition = $derived(
    !!(meal.calories || meal.proteinG || meal.carbsG || meal.fatG),
  )
  const hasUnscalableIngredients = $derived(
    data.ingredients.some((ingredient) => ingredient.qty === null),
  )
  const scale = (v: number | null) =>
    v == null ? null : Math.round(Number(v) * factor)
  const scaleG = (v: string | null) =>
    v == null ? null : (Number(v) * factor).toFixed(1)
  const scaleQty = (v: number) => Number((v * factor).toFixed(2))

  async function deleteMeal() {
    if (!confirm(t('Delete this meal?'))) return
    await removeMeal(meal.id)
    await goto('/meals')
  }

  async function duplicate() {
    const copy = await duplicateMeal(meal.id)
    await goto(`/meals/${copy.id}`)
  }
</script>

<div class="page">
  {#if cooking && meal.instructions}
    <CookingMode
      name={meal.name}
      instructions={meal.instructions}
      ingredients={data.ingredients}
      baseServings={base}
      bind:servings
      closeHref={`/meals/${meal.id}`}
    />
  {/if}
  {#if editing}
    <MealEditForm
      meal={sourceMeal}
      ingredients={data.ingredients}
      onCancel={() => (editing = false)}
      onSaved={(updated) => {
        sourceMeal = updated
        editing = false
      }}
    />
  {:else if translating}
    <MealTranslationForm
      meal={sourceMeal}
      {translations}
      currentLocale={data.locale}
      onCancel={() => (translating = false)}
      onChanged={(translation, locale) => {
        translations = translation
          ? [
              ...translations.filter((item) => item.locale !== locale),
              translation,
            ]
          : translations.filter((item) => item.locale !== locale)
        translating = false
      }}
    />
  {:else}
    <div class="top-bar">
      <a class="back" href="/meals">{t('← Meals')}</a>
      {#if meal.instructions}
        <a class="btn cook sm" href={`?cook=1`}>{t('Start cooking')}</a>
      {/if}
      {#if data.editable}
        <div class="actions">
          <button class="btn ghost sm" onclick={() => (editing = true)}
            >{t('Edit')}</button
          >
          <button class="btn ghost sm" onclick={() => (translating = true)}
            >{t('Translate')}</button
          >
          <button class="btn danger sm" type="button" onclick={deleteMeal}
            >{t('Delete')}</button
          >
        </div>
      {:else}
        <button class="btn ghost sm" type="button" onclick={duplicate}
          >{t('Make a personal copy')}</button
        >
      {/if}
    </div>

    <div class="detail">
      {#if meal.imageUrl}
        <img class="hero" src={meal.imageUrl} alt={meal.name} />
      {/if}

      <div class="header">
        <div class="title">
          <p class="eyebrow">{t('Recipe')}</p>
          <h1 lang={data.locale}>{meal.name}</h1>
        </div>
        <div class="meta">
          {#if meal.timeMinutes}<span class="badge"
              >{t('{minutes} min preparation', {
                minutes: meal.timeMinutes,
              })}</span
            >{/if}
          {#if meal.difficulty}<span class="badge diff-{meal.difficulty}"
              >{label(meal.difficulty)}</span
            >{/if}
        </div>
      </div>

      {#if meal.tags?.length}
        <div class="chips">
          {#each meal.tags as tag}
            <span class="chip">{label(tag)}</span>
          {/each}
        </div>
      {/if}

      {#if hasNutrition || data.ingredients.length}
        <div class="nutrition-block">
          <div class="servings-step">
            <button
              type="button"
              aria-label={t('Fewer servings')}
              onclick={() => (servings = Math.max(1, servings - 1))}>−</button
            >
            <span>{namedCount(servings, 'serving')}</span>
            <button
              type="button"
              aria-label={t('More servings')}
              onclick={() => (servings += 1)}>+</button
            >
          </div>
          {#if hasNutrition}
            <div class="nutrition">
              {#if meal.calories}<span>{scale(meal.calories)} kcal</span>{/if}
              {#if meal.proteinG}<span
                  >{t('{value}g protein', {
                    value: scaleG(meal.proteinG) ?? '',
                  })}</span
                >{/if}
              {#if meal.carbsG}<span
                  >{t('{value}g carbs', {
                    value: scaleG(meal.carbsG) ?? '',
                  })}</span
                >{/if}
              {#if meal.fatG}<span
                  >{t('{value}g fat', { value: scaleG(meal.fatG) ?? '' })}</span
                >{/if}
            </div>
          {/if}
        </div>
      {/if}

      {#if meal.description}
        <p class="description" lang={data.locale}>{meal.description}</p>
      {/if}

      {#if data.ingredients.length}
        <section>
          <h2>{t('Ingredients')}</h2>
          {#if hasUnscalableIngredients}
            <p class="scale-notice" role="note">
              {t(
                'Ingredients without a numeric quantity cannot be scaled. Edit the recipe to add one.',
              )}
            </p>
          {/if}
          <ul>
            {#each data.ingredients as ing}
              <li>
                {ing.qty !== null
                  ? `${scaleQty(ing.qty)}${ing.unit ? ' ' + label(ing.unit) : ''} `
                  : ''}{ing.name}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if meal.instructions}
        <section>
          <h2>{t('Instructions')}</h2>
          <p class="instructions" lang={data.locale}>{meal.instructions}</p>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 900px;
    margin: 0 auto;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .back {
    font-size: 0.875rem;
    color: $color-text-muted;
    text-decoration: none;
    &:hover {
      color: $color-text;
    }
  }
  .actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .hero {
    width: 100%;
    max-height: 480px;
    object-fit: cover;
    border-radius: $radius;
    box-shadow: 0 18px 48px rgb(41 39 33 / 10%);
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  .title {
    flex: 1;
  }
  .eyebrow {
    margin-bottom: 4px;
    color: $color-accent;
    font-size: 0.7rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 5vw, 3.4rem);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }
  h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.35rem;
    font-weight: 500;
    margin-bottom: 12px;
  }

  .meta {
    display: flex;
    gap: 6px;
    align-items: center;
    padding-top: 4px;
  }

  .badge {
    font-size: 0.75rem;
    padding: 3px 9px;
    border-radius: 9999px;
    background: $color-surface-2;
    color: $color-text-muted;
    font-weight: 500;

    &.diff-easy {
      background: #d1fae5;
      color: #065f46;
    }
    &.diff-medium {
      background: #fef3c7;
      color: #92400e;
    }
    &.diff-hard {
      background: #fee2e2;
      color: #991b1b;
    }
  }

  .nutrition-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }

  .servings-step {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.8rem;
    color: $color-text-muted;

    button {
      width: 24px;
      height: 24px;
      border: 1px solid $color-border-strong;
      background: $color-surface-2;
      color: $color-text;
      border-radius: $radius-sm;
      cursor: pointer;
      line-height: 1;
      &:hover {
        border-color: $color-accent;
      }
    }
  }

  .nutrition {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: $color-text;
    flex-wrap: wrap;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: $color-surface-2;
    border: 1px solid $color-border-strong;
    border-radius: 999px;
    font-size: 0.78rem;
    color: $color-text-muted;
  }

  .description {
    color: $color-text-muted;
    max-width: 700px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.1rem;
    line-height: 1.7;
  }
  section {
    display: flex;
    flex-direction: column;
    padding: 22px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }

  ul {
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .scale-notice {
    margin: -4px 0 12px;
    color: $color-text-muted;
    font-size: 0.8rem;
  }

  .instructions {
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  .btn {
    min-height: 38px;
    padding: 7px 14px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: opacity 0.15s;
    &:hover {
      opacity: 0.85;
    }
    &.sm {
      padding: 3px 10px;
      font-size: 0.8rem;
    }
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

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
    }
    .meta {
      padding-top: 0;
    }
    section {
      padding: 18px;
    }
  }
</style>
