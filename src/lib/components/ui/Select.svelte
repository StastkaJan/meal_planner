<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLSelectAttributes } from 'svelte/elements'

  let {
    value = $bindable(),
    children,
    class: className = '',
    ...rest
  }: HTMLSelectAttributes & { children?: Snippet } = $props()
</script>

<select {...rest} bind:value class={`ui-select ${className}`}>
  {@render children?.()}
</select>

<style lang="scss">
  .ui-select {
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface-2;

    &:focus {
      border-color: $color-accent;
      outline: none;
    }
  }
</style>
