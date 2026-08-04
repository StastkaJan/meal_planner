<script lang="ts">
  import AuthForm from '../_components/AuthForm.svelte'

  let { form } = $props()
</script>

<AuthForm
  title="Sign in"
  submitLabel="Sign in"
  alternateHref="/auth/register"
  alternateLabel="Create account"
  error={form?.error}
/>
