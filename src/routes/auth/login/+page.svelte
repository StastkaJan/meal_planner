<script lang="ts">
  import AuthForm from '../_components/AuthForm.svelte'
  import { useI18n } from '$lib/i18n-context'

  let { form } = $props()
  const { t } = useI18n()
</script>

<AuthForm
  title={t('Sign in')}
  submitLabel={t('Sign in')}
  alternateHref="/auth/register"
  alternateLabel={t('Create account')}
  error={form?.error}
/>
