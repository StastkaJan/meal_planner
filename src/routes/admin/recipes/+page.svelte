<script lang="ts">
  import type { PageData } from './$types'
  import { queueCatalogue, reviewCatalogueRecipe } from '$lib/api/catalogue'
  import Button from '$lib/components/ui/Button.svelte'

  let { data }: { data: PageData } = $props()
  let imports = $derived(data.imports)
  let payload = $state('')
  let message = $state('')
  let busy = $state(false)

  async function queue() {
    message = ''
    busy = true
    try {
      const parsed = JSON.parse(payload)
      const result = await queueCatalogue(parsed)
      message = `${result.accepted} queued, ${result.duplicates} duplicates, ${result.errors.length} invalid.`
      if (result.accepted) location.reload()
    } catch (cause) {
      message = cause instanceof Error ? cause.message : 'Import failed'
    } finally {
      busy = false
    }
  }

  async function review(id: number, status: 'approved' | 'rejected') {
    await reviewCatalogueRecipe(id, status)
    imports = imports.filter((entry) => entry.id !== id)
  }
</script>

<div class="page">
  <div>
    <p class="eyebrow">Global catalogue</p>
    <h1>Recipe review</h1>
    <p class="subtitle">
      Queue licensed recipe data, then approve it for everyone.
    </p>
  </div>

  <section>
    <h2>Batch import</h2>
    <p>
      Paste a JSON array of 1–300 recipes. Each needs a name, ingredients, and
      instructions.
    </p>
    <textarea bind:value={payload} rows="8" placeholder="Paste recipe JSON here"
    ></textarea>
    <div class="submit">
      <Button onclick={queue} disabled={busy || !payload.trim()}>
        {busy ? 'Validating…' : 'Queue recipes'}
      </Button>
      {#if message}<span>{message}</span>{/if}
    </div>
  </section>

  <section>
    <h2>Pending ({imports.length})</h2>
    {#if imports.length}
      <div class="queue">
        {#each imports as entry}
          <article>
            <div>
              <h3>{String(entry.recipe.name)}</h3>
              <details>
                <summary>Review content</summary>
                {#if entry.recipe.description}
                  <p>{String(entry.recipe.description)}</p>
                {/if}
                <h4>Ingredients</h4>
                <ul>
                  {#each entry.recipe.ingredients as ingredient}
                    <li>
                      {ingredient.qty ?? ''}
                      {ingredient.unit ?? ''}
                      {ingredient.name}
                    </li>
                  {/each}
                </ul>
                <h4>Instructions</h4>
                <p class="instructions">{String(entry.recipe.instructions)}</p>
              </details>
            </div>
            <div class="actions">
              <Button size="sm" onclick={() => review(entry.id, 'approved')}
                >Approve</Button
              >
              <Button
                size="sm"
                variant="danger"
                onclick={() => review(entry.id, 'rejected')}>Reject</Button
              >
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <p>No recipes awaiting review.</p>
    {/if}
  </section>
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
