<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    label,
    for: forId,
    hint,
    error,
    children,
  }: {
    label: string
    for?: string
    hint?: string
    error?: string
    children: Snippet
  } = $props()
</script>

<div class="field">
  <label for={forId}>{label}</label>
  {@render children()}
  {#if error}<small class="error">{error}</small>{/if}
  {#if hint}<small class="hint">{hint}</small>{/if}
</div>

<style lang="scss">
  .field {
    display: grid;
    gap: 0.35rem;
  }

  label {
    font-size: 0.85rem;
    color: $color-text-muted;
  }

  small {
    font-size: 0.78rem;
  }

  .hint {
    color: $color-text-muted;
  }

  .error {
    color: $color-danger;
  }
</style>
