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
