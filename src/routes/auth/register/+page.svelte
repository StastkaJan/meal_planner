<script lang="ts">
  import AuthForm from '../_components/AuthForm.svelte'

  let { form } = $props()
</script>

<AuthForm
  title="Create account"
  submitLabel="Create account"
  alternateHref="/auth/login"
  alternateLabel="Sign in instead"
  error={form?.error}
/>
