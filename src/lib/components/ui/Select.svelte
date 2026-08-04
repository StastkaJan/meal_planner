<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements'

  type Option = string | { value: string; label: string }

  let {
    value = $bindable(),
    options,
    class: className = '',
    ...rest
  }: HTMLSelectAttributes & { options: readonly Option[] } = $props()
</script>

<select {...rest} bind:value class={`ui-select ${className}`}>
  {#each options as option}
    <option value={typeof option === 'string' ? option : option.value}>
      {typeof option === 'string' ? option : option.label}
    </option>
  {/each}
</select>

<style lang="scss">
  .ui-select {
    width: 100%;
    min-height: 42px;
    padding: 0.65rem 2rem 0.65rem 0.75rem;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgb(216 95 54 / 12%);
      outline: 0;
    }
  }
</style>
