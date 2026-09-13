<script lang="ts" generics="T">
  import type { Snippet } from 'svelte'
  import type { HTMLTableAttributes } from 'svelte/elements'

  let {
    data,
    columns,
    row,
    emptyMessage = 'No rows.',
    caption,
    class: className = '',
    ...rest
  }: HTMLTableAttributes & {
    data: readonly T[]
    columns: readonly string[]
    row: Snippet<[T]>
    emptyMessage?: string
    caption?: string
  } = $props()
</script>

<div class="table-scroll">
  <table {...rest} class={`ui-table ${className}`}>
    {#if caption}<caption>{caption}</caption>{/if}
    <thead>
      <tr>
        {#each columns as column}<th scope="col">{column}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each data as item}
        {@render row(item)}
      {:else}
        <tr>
          <td colspan={columns.length} class="empty">{emptyMessage}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style lang="scss">
  .table-scroll {
    min-width: 0;
    overflow-x: auto;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
  }

  .ui-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  :global(.ui-table th),
  :global(.ui-table td) {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid rgba($color-border, 0.55);
    text-align: left;
    font-size: 0.875rem;
  }

  :global(.ui-table th) {
    color: $color-text-muted;
    font-weight: 500;
    background: rgba($color-surface-2, 0.4);
  }

  :global(.ui-table tbody tr:last-child td) {
    border-bottom: 0;
  }
  :global(.ui-table tbody tr:hover) {
    background: rgba($color-surface-2, 0.35);
  }
  :global(.ui-table th:last-child:not(:first-child)) {
    text-align: right;
  }

  :global(.ui-table .empty) {
    padding: 2rem;
    color: $color-text-muted;
    text-align: center;
  }
</style>
