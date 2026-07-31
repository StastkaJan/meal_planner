<script lang="ts">
  import Checkbox from './Checkbox.svelte'

  let {
    options,
    selected = $bindable([]),
    name,
    format = (value) => value,
    onChange,
  }: {
    options: readonly string[]
    selected?: string[]
    name?: string
    format?: (value: string) => string
    onChange?: (selected: string[]) => void
  } = $props()

  function toggle(option: string) {
    selected = selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option]
    onChange?.(selected)
  }
</script>

<div class="choices">
  {#each options as option}
    <label class:active={selected.includes(option)}>
      <Checkbox
        {name}
        value={option}
        checked={selected.includes(option)}
        onchange={() => toggle(option)}
      />
      {format(option)}
    </label>
  {/each}
</div>

<style lang="scss">
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  label {
    position: relative;
    padding: 0.42rem 0.72rem;
    border: 1px solid $color-border;
    border-radius: 999px;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 0.85rem;
    transition:
      border-color 0.15s,
      background 0.15s,
      color 0.15s;

    &:hover {
      border-color: $color-accent;
      color: $color-text;
    }
  }

  label.active {
    border-color: $color-accent;
    background: $color-accent-dim;
    color: $color-text;
  }

  label:focus-within {
    outline: 3px solid rgb(216 95 54 / 22%);
    outline-offset: 2px;
  }

  .choices :global(input) {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
  }
</style>
