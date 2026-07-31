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
    min-height: 7rem;
    padding: 0.7rem 0.75rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    resize: vertical;

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgb(216 95 54 / 12%);
      outline: 0;
    }
  }
</style>
