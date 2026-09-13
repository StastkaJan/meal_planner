<script lang="ts">
  import { useI18n } from '$lib/i18n-context'
  let {
    page,
    totalPages,
    hasMore = false,
    href,
    onPageChange,
    disabled = false,
    label,
  }: {
    page: number
    totalPages?: number
    hasMore?: boolean
    href?: (page: number) => string
    onPageChange?: (page: number) => void
    disabled?: boolean
    label?: string
  } = $props()
  const { t } = useI18n()
  const pages = $derived(
    totalPages
      ? [...new Set([1, page - 1, page, page + 1, totalPages])]
          .filter((value) => value >= 1 && value <= totalPages)
          .sort((a, b) => a - b)
      : [page],
  )
</script>

{#snippet control(
  target: number,
  text: string,
  accessible: string,
  unavailable = false,
)}
  {#if href && !unavailable && !disabled}
    <a class="control" href={href(target)} aria-label={accessible}>{text}</a>
  {:else}
    <button
      class="control"
      type="button"
      disabled={disabled || unavailable}
      aria-label={accessible}
      onclick={() => onPageChange?.(target)}>{text}</button
    >
  {/if}
{/snippet}

<nav aria-label={label ?? t('Pagination')}>
  {@render control(page - 1, '‹', t('Previous page'), page <= 1)}
  {#each pages as number, index}
    {#if index > 0 && number - pages[index - 1] > 1}
      <span class="ellipsis" aria-hidden="true">…</span>
    {/if}
    <span class="number" class:current={number === page}>
      {#if number === page}
        <span class="control selected" aria-current="page">{number}</span>
      {:else}
        {@render control(number, String(number), String(number))}
      {/if}
    </span>
  {/each}
  {@render control(
    page + 1,
    '›',
    t('Next page'),
    totalPages ? page >= totalPages : !hasMore,
  )}
  {#if totalPages}
    <span class="summary"
      >{t('Page {page} of {pages}', { page, pages: totalPages })}</span
    >
  {/if}
</nav>

<style lang="scss">
  nav {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .control {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    height: 2.25rem;
    padding: 0 0.5rem;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: $color-text;
    font: inherit;
    font-size: 0.875rem;
    text-decoration: none;
    cursor: pointer;
  }
  .control:hover:not(:disabled) {
    background: $color-surface-2;
  }
  .control:focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
  .control:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .selected {
    background: $color-surface;
    border-color: $color-border;
    box-shadow: 0 1px 2px rgba($color-text, 0.04);
    font-weight: 600;
    cursor: default;
  }
  .ellipsis {
    width: 2rem;
    text-align: center;
    color: $color-text-muted;
  }
  .summary {
    flex-basis: 100%;
    margin-top: 0.5rem;
    text-align: center;
    color: $color-text-muted;
    font-size: 0.75rem;
  }
  @media (max-width: 480px) {
    .number:not(.current),
    .ellipsis {
      display: none;
    }
  }
</style>
