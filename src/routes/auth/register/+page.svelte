<script lang="ts">
  import AuthForm from '../_components/AuthForm.svelte'
  import { useI18n } from '$lib/i18n-context'

  let { form } = $props()
  const { t } = useI18n()
</script>

<AuthForm
  title={t('Create account')}
  submitLabel={t('Create account')}
  alternateHref="/auth/login"
  alternateLabel={t('Sign in instead')}
  error={form?.error}
  legalAcceptance
/>
