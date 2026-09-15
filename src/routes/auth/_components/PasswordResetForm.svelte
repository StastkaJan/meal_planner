<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import { requestPasswordReset, resetPassword } from '$lib/api/auth'
  import { useI18n } from '$lib/i18n-context'

  let { token }: { token?: string } = $props()
  const { t, message } = useI18n()
  let email = $state('')
  let password = $state('')
  let confirmation = $state('')
  let busy = $state(false)
  let success = $state(false)
  let error = $state('')
  const resetting = $derived(token !== undefined)
  const validToken = $derived(
    token !== undefined && /^[a-f0-9]{64}$/.test(token),
  )

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (busy) return
    error = ''
    if (resetting && password !== confirmation) {
      error = 'Passwords do not match'
      return
    }
    busy = true
    try {
      if (resetting) await resetPassword(token!, password)
      else await requestPasswordReset(email)
      success = true
      password = confirmation = ''
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong.'
    } finally {
      busy = false
    }
  }
</script>

<svelte:head>
  <title>{t('Reset password')} | Papuplan</title>
  <meta name="referrer" content="no-referrer" />
</svelte:head>

<section class="auth-box">
  <h1>{t('Reset password')}</h1>
  {#if success}
    <p role="status">
      {resetting
        ? t('Your password has been reset. Sign in with your new password.')
        : t(
            'If an account exists for this email, you will receive a password reset link shortly.',
          )}
    </p>
  {:else if resetting && !validToken}
    <p role="alert">
      {t('This reset link is invalid or expired. Request a new one.')}
    </p>
  {:else}
    <p>
      {resetting
        ? t('Choose a new password for your account.')
        : t('Enter your email and we will send you a password reset link.')}
    </p>
    <form onsubmit={submit}>
      {#if error}<p class="error" role="alert">{message(error)}</p>{/if}
      {#if resetting}
        <Field label={t('New password')} for="new-password">
          <Input
            id="new-password"
            type="password"
            autocomplete="new-password"
            bind:value={password}
            minlength={8}
            maxlength={128}
            required
          />
        </Field>
        <Field label={t('Confirm password')} for="confirm-password">
          <Input
            id="confirm-password"
            type="password"
            autocomplete="new-password"
            bind:value={confirmation}
            minlength={8}
            maxlength={128}
            required
          />
        </Field>
      {:else}
        <Field label={t('Email')} for="email">
          <Input
            id="email"
            type="email"
            autocomplete="email"
            bind:value={email}
            maxlength={254}
            required
          />
        </Field>
      {/if}
      <Button type="submit" disabled={busy}
        >{busy
          ? t('Loading…')
          : resetting
            ? t('Reset password')
            : t('Send reset link')}</Button
      >
    </form>
  {/if}
  {#if resetting && !success}<p>
      <a href="/auth/forgot-password">{t('Request a new reset link')}</a>
    </p>{/if}
  <p><a href="/auth/login">{t('Back to sign in')}</a></p>
</section>

<style lang="scss">
  .auth-box {
    max-width: 420px;
    margin: 7vh auto;
    padding: 30px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }
  h1 {
    font-family: Georgia, serif;
    font-weight: 500;
  }
  form {
    display: grid;
    gap: 16px;
  }
  p {
    margin: 16px 0;
  }
  .error {
    color: $color-danger;
  }
  a {
    color: $color-accent;
  }
</style>
