<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    value = $bindable(),
    class: className = '',
    ...rest
  }: HTMLInputAttributes = $props()
</script>

<input {...rest} bind:value class={`ui-input ${className}`} />

<style lang="scss">
  .ui-input {
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
