<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLDialogAttributes } from 'svelte/elements'

  let {
    element = $bindable(),
    children,
    class: className = '',
    modal = false,
    ...rest
  }: HTMLDialogAttributes & {
    element?: HTMLDialogElement
    children?: Snippet
    modal?: boolean
  } = $props()

  $effect(() => {
    if (modal && element && !element.open) element.showModal()
  })
</script>

<dialog {...rest} bind:this={element} class={`ui-dialog ${className}`}>
  {@render children?.()}
</dialog>

<style lang="scss">
  .ui-dialog {
    max-width: min(36rem, calc(100vw - 2rem));
    padding: 1.5rem;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-text;

    &::backdrop {
      background: rgb(41 39 33 / 52%);
      backdrop-filter: blur(3px);
    }
  }
</style>
