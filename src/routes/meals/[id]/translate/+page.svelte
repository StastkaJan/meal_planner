<script lang="ts">
  import { goto } from '$app/navigation'
  import { useI18n } from '$lib/i18n-context'
  import MealTranslationForm from '../_components/MealTranslationForm.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  const { t } = useI18n()
  const recipeUrl = $derived(`/meals/${data.sourceMeal.id}`)
</script>

<svelte:head>
  <title>{t('Translate')} · {data.sourceMeal.name}</title>
</svelte:head>

<div class="page">
  <a href={recipeUrl}>← {data.meal.name}</a>
  <h1>{t('Translate')}</h1>
  {#key data.sourceMeal.id}
    <MealTranslationForm
      meal={data.sourceMeal}
      ingredients={data.ingredients}
      translations={data.translations}
      currentLocale={data.locale}
      onCancel={() => goto(recipeUrl)}
      onChanged={() => goto(recipeUrl)}
    />
  {/key}
</div>

<style lang="scss">
  .page {
    display: grid;
    gap: 16px;
    max-width: 900px;
    margin: 0 auto;
  }
  a {
    color: $color-text-muted;
    font-size: 0.875rem;
    overflow-wrap: anywhere;
  }
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 5vw, 3.4rem);
    font-weight: 500;
  }
</style>
