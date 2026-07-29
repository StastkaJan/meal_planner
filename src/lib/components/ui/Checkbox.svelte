<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    checked = $bindable(false),
    ...rest
  }: Omit<HTMLInputAttributes, 'type'> = $props()
</script>

<input {...rest} type="checkbox" bind:checked />
