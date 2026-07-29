<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLTableAttributes } from 'svelte/elements'

  let {
    children,
    caption,
    class: className = '',
    ...rest
  }: HTMLTableAttributes & { children?: Snippet; caption?: string } = $props()
</script>

<div class="table-scroll">
  <table {...rest} class={`ui-table ${className}`}>
    {#if caption}<caption>{caption}</caption>{/if}
    {@render children?.()}
  </table>
</div>

<style lang="scss">
  .table-scroll {
    overflow-x: auto;
  }

  .ui-table {
    width: 100%;
    border-collapse: collapse;
  }

  :global(.ui-table th),
  :global(.ui-table td) {
    padding: 0.65rem;
    border-bottom: 1px solid $color-border;
    text-align: left;
  }

  :global(.ui-table th) {
    color: $color-text-muted;
    font-size: 0.8rem;
    text-transform: uppercase;
  }
</style>
