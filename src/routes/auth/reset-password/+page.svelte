<script lang="ts">
  import PasswordResetForm from '../_components/PasswordResetForm.svelte'
  import type { PageData } from './$types'
  let { data }: { data: PageData } = $props()
</script>

{#key data.token}<PasswordResetForm token={data.token} />{/key}
