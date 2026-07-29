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
    padding: 0.3rem 0.6rem;
    border: 1px solid $color-border;
    border-radius: 999px;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 0.85rem;
  }

  label.active {
    border-color: $color-accent;
    background: $color-accent-dim;
    color: $color-text;
  }

  .choices :global(input) {
    position: absolute;
    opacity: 0;
  }
</style>
