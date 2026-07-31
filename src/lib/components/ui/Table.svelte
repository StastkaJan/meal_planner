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
        {#each columns as column}<th>{column}</th>{/each}
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
    overflow-x: auto;
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
    border-bottom: 1px solid $color-border;
    text-align: left;
  }

  :global(.ui-table th) {
    color: $color-text-muted;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: #faf8f2;
  }

  :global(.ui-table .empty) {
    padding: 2rem;
    color: $color-text-muted;
    text-align: center;
  }
</style>
