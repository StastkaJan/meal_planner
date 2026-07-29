<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  let {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    class: className = '',
    ...rest
  }: HTMLButtonAttributes & {
    children?: Snippet
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'sm' | 'md'
  } = $props()
</script>

<button {...rest} {type} class={`ui-button ${variant} ${size} ${className}`}>
  {@render children?.()}
</button>

<style lang="scss">
  .ui-button {
    border: 1px solid transparent;
    border-radius: $radius;
    color: white;
    cursor: pointer;
    font-weight: 600;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 2px;
    }
  }

  .md {
    padding: 0.55rem 0.9rem;
  }

  .sm {
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
  }

  .primary {
    background: $color-accent;
  }

  .secondary {
    background: $color-surface-2;
    border-color: $color-border;
    color: $color-text;
  }

  .danger {
    background: $color-danger;
  }
</style>
