<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    checked = $bindable(false),
    ...rest
  }: Omit<HTMLInputAttributes, 'type'> = $props()
</script>

<input {...rest} type="checkbox" bind:checked />

<style lang="scss">
  input {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    appearance: none;
    border: 1px solid $color-border-strong;
    border-radius: 5px;
    background: $color-surface;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s;

    &:checked {
      border-color: $color-accent;
      background-color: $color-accent;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 8 2.5 2.5L12 5' fill='none' stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E");
    }

    &:hover:not(:disabled) {
      border-color: $color-accent;
    }

    &:focus-visible {
      outline: 0;
      box-shadow: 0 0 0 3px rgb(216 95 54 / 18%);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
</style>
