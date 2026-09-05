<script lang="ts">
  import { goto } from '$app/navigation'
  import { useI18n } from '$lib/i18n-context'
  import MealEditForm from '../_components/MealEditForm.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  const { t } = useI18n()
  const recipeUrl = $derived(`/meals/${data.sourceMeal.id}`)
</script>

<svelte:head>
  <title>{t('Edit')} · {data.sourceMeal.name}</title>
</svelte:head>

<div class="page">
  <a href={recipeUrl}>← {data.meal.name}</a>
  <h1>{t('Edit')}</h1>
  {#key data.sourceMeal.id}
    <MealEditForm
      meal={data.sourceMeal}
      ingredients={data.ingredients}
      hasUploadedImage={data.hasUploadedImage}
      onCancel={() => goto(recipeUrl)}
      onSaved={() => goto(recipeUrl)}
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
