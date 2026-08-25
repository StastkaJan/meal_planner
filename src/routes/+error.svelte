<script lang="ts">
  import { page } from '$app/stores'
  import {
    parseLocale,
    translate,
    translateMessage,
    type MessageKey,
    type MessageParams,
  } from '$lib/i18n'

  const locale = $derived(parseLocale($page.data.locale) ?? 'en')
  const t = (key: MessageKey, params?: MessageParams) =>
    translate(locale, key, params)
  const message = (value: string) => translateMessage(locale, value)
  const heading = $derived(
    $page.status === 404 ? t('Page not found') : t('Unexpected error'),
  )
</script>

<svelte:head>
  <title>{heading}</title>
</svelte:head>

<section class="error-page">
  <p class="status">{$page.status}</p>
  <h1>{heading}</h1>
  {#if $page.error?.message}
    <p>{message($page.error.message)}</p>
  {/if}
  <a href="/">{t('Back to home')}</a>
</section>

<style lang="scss">
  .error-page {
    max-width: 36rem;
    margin: 5rem auto;
    text-align: center;
  }
  .status,
  p {
    color: $color-text-muted;
  }
  .status {
    font-weight: 700;
  }
  h1 {
    margin: 0.25rem 0 1rem;
  }
  a {
    display: inline-block;
    margin-top: 1rem;
    color: $color-accent;
    font-weight: 650;
  }
</style>
