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
    min-height: 42px;
    padding: 0.65rem 0.75rem;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;
    box-shadow: inset 0 1px 1px rgb(41 39 33 / 3%);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgb(216 95 54 / 12%);
      outline: 0;
    }
  }
</style>
