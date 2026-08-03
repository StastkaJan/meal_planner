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
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    color: white;
    cursor: pointer;
    font-weight: 600;
    line-height: 1;
    transition:
      transform 0.15s,
      box-shadow 0.15s,
      background 0.15s;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 5px 14px rgb(41 39 33 / 12%);
    }

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
    padding: 0.7rem 1rem;
  }

  .sm {
    min-height: 32px;
    padding: 0.45rem 0.7rem;
    font-size: 0.85rem;
  }

  .primary {
    background: $color-accent;
  }

  .secondary {
    background: $color-surface;
    border-color: $color-border-strong;
    color: $color-text;
  }

  .danger {
    border-color: rgb(184 59 50 / 18%);
    background: #f9e4e1;
    color: $color-danger;
  }
</style>
