<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  let {
    value = $bindable(),
    class: className = '',
    ...rest
  }: HTMLTextareaAttributes = $props()
</script>

<textarea {...rest} bind:value class={`ui-textarea ${className}`}></textarea>

<style lang="scss">
  .ui-textarea {
    width: 100%;
    min-height: 6rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface-2;
    resize: vertical;

    &:focus {
      border-color: $color-accent;
      outline: none;
    }
  }
</style>
