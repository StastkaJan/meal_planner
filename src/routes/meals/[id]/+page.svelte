<script lang="ts">
  import { goto } from '$app/navigation'
  import MealEditForm from './MealEditForm.svelte'
  import type { PageData } from './$types'
  import { DIFF_LABEL } from '$lib/constants'

  let { data }: { data: PageData } = $props()
  let editing = $state(false)

  // Servings scaler: nutrition is stored for the recipe's own serving count; the stepper
  // rescales the displayed numbers only (ingredient text is free-form, left untouched).
  const base = $derived(data.meal.servings || 1)
  let servings = $state(data.meal.servings || 1)
  const factor = $derived(servings / base)
  const hasNutrition = $derived(
    !!(
      data.meal.calories ||
      data.meal.proteinG ||
      data.meal.carbsG ||
      data.meal.fatG
    ),
  )
  const scale = (v: number | null) =>
    v == null ? null : Math.round(Number(v) * factor)
  const scaleG = (v: string | null) =>
    v == null ? null : (Number(v) * factor).toFixed(1)

  async function deleteMeal() {
    if (!confirm('Delete this meal?')) return
    await fetch(`/meals/${data.meal.id}`, { method: 'DELETE' })
    await goto('/meals')
  }
</script>

<div class="page">
  {#if editing}
    <MealEditForm
      meal={data.meal}
      onCancel={() => (editing = false)}
      onSaved={() => (editing = false)}
    />
  {:else}
    <div class="top-bar">
      <a class="back" href="/meals">← Meals</a>
      <div class="actions">
        <button class="btn ghost sm" onclick={() => (editing = true)}
          >Edit</button
        >
        <button class="btn danger sm" type="button" onclick={deleteMeal}
          >Delete</button
        >
      </div>
    </div>

    <div class="detail">
      {#if data.meal.imageUrl}
        <img class="hero" src={data.meal.imageUrl} alt={data.meal.name} />
      {/if}

      <div class="header">
        <h1>{data.meal.name}</h1>
        <div class="meta">
          {#if data.meal.timeMinutes}<span class="badge"
              >{data.meal.timeMinutes} min</span
            >{/if}
          {#if data.meal.difficulty}<span
              class="badge diff-{data.meal.difficulty}"
              >{DIFF_LABEL[data.meal.difficulty] ?? data.meal.difficulty}</span
            >{/if}
        </div>
      </div>

      {#if data.meal.tags?.length}
        <div class="chips">
          {#each data.meal.tags as tag}
            <span class="chip">{tag.replace('_', ' ')}</span>
          {/each}
        </div>
      {/if}

      {#if hasNutrition}
        <div class="nutrition-block">
          <div class="servings-step">
            <button
              type="button"
              aria-label="Fewer servings"
              onclick={() => (servings = Math.max(1, servings - 1))}>−</button
            >
            <span>{servings} serving{servings === 1 ? '' : 's'}</span>
            <button
              type="button"
              aria-label="More servings"
              onclick={() => (servings += 1)}>+</button
            >
          </div>
          <div class="nutrition">
            {#if data.meal.calories}<span>{scale(data.meal.calories)} kcal</span
              >{/if}
            {#if data.meal.proteinG}<span
                >{scaleG(data.meal.proteinG)}g protein</span
              >{/if}
            {#if data.meal.carbsG}<span>{scaleG(data.meal.carbsG)}g carbs</span
              >{/if}
            {#if data.meal.fatG}<span>{scaleG(data.meal.fatG)}g fat</span>{/if}
          </div>
        </div>
      {/if}

      {#if data.meal.description}
        <p class="description">{data.meal.description}</p>
      {/if}

      {#if data.meal.ingredients?.length}
        <section>
          <h2>Ingredients</h2>
          <ul>
            {#each data.meal.ingredients as ing}
              <li>{ing}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if data.meal.instructions}
        <section>
          <h2>Instructions</h2>
          <p class="instructions">{data.meal.instructions}</p>
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
    max-width: 720px;
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
    gap: 20px;
  }

  .hero {
    width: 100%;
    max-height: 360px;
    object-fit: cover;
    border-radius: $radius-sm;
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    flex: 1;
  }
  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 8px;
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
    gap: 8px;
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
      border: 1px solid $color-border;
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
    color: $color-text-muted;
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
    border: 1px solid $color-border;
    border-radius: 999px;
    font-size: 0.78rem;
    color: $color-text-muted;
  }

  .description {
    color: $color-text-muted;
    line-height: 1.6;
  }

  section {
    display: flex;
    flex-direction: column;
  }

  ul {
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .instructions {
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  .btn {
    padding: 5px 14px;
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
      border: 1px solid $color-border;
    }
    &.danger {
      background: $color-danger;
    }
  }
</style>
