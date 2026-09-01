<script lang="ts">
  import '../app.scss'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { recordLegalNotice } from '$lib/api/legal'
  import { provideI18n } from '$lib/i18n-context'
  import type { LegalNotice } from '$lib/legal'

  let { children, data } = $props()
  const { t, message } = provideI18n(() => data.locale)
  let legalNotices = $derived(data.legalNotices)
  let savingLegalNotice = $state('')
  let legalNoticeError = $state('')

  async function confirmLegalNotice(notice: LegalNotice) {
    savingLegalNotice = `${notice.document}:${notice.version}`
    legalNoticeError = ''
    try {
      await recordLegalNotice(notice.document, notice.version)
      legalNotices = legalNotices.filter(
        (item: LegalNotice) =>
          item.document !== notice.document || item.version !== notice.version,
      )
    } catch (error) {
      legalNoticeError =
        error instanceof Error ? message(error.message) : t('Request failed')
    } finally {
      savingLegalNotice = ''
    }
  }

  const pageTitle = $derived.by(() => {
    const path = $page.url.pathname
    if (path.startsWith('/plans/') && path.endsWith('/shopping'))
      return t('Shopping list')
    if (path === '/' || path.startsWith('/plans/')) return t('Planner')
    if (path.startsWith('/meals')) return t('Recipes')
    if (path.startsWith('/admin')) return t('Admin')
    if (path === '/profile') return t('Profile')
    if (path === '/pricing') return t('Pricing')
    if (path.startsWith('/auth/login')) return t('Sign in')
    if (path.startsWith('/auth/register')) return t('Create account')
    return t('Meal plan')
  })

  $effect(() => {
    if (browser) document.documentElement.lang = data.locale
  })
</script>

<svelte:head>
  <title>{pageTitle} · {t('Meal plan')}</title>
</svelte:head>

<header class="shell-header">
  <nav aria-label={t('Main navigation')}>
    <a class="brand" href="/" aria-label={t('Meal Plan home')}>
      <span class="brand-mark">M</span>
      <span>{t('Meal plan')}</span>
    </a>
    {#if data.user}
      <div class="main-links">
        <a
          href="/"
          class:active={$page.url.pathname === '/' ||
            $page.url.pathname.startsWith('/plans/')}>{t('Planner')}</a
        >
        <a href="/meals" class:active={$page.url.pathname.startsWith('/meals')}
          >{t('Recipes')}</a
        >
        {#if data.user.isAdmin}
          <a
            href="/admin/recipes"
            class:active={$page.url.pathname.startsWith('/admin')}
            >{t('Admin')}</a
          >
        {/if}
      </div>
      <div class="account-links">
        <a
          class="profile"
          href="/profile"
          class:active={$page.url.pathname === '/profile'}
        >
          <span class="avatar">{data.user.email.slice(0, 1).toUpperCase()}</span
          >
          <span class="email">{data.user.email}</span>
        </a>
        <form method="POST" action="/auth/logout">
          <button type="submit">{t('Sign out')}</button>
        </form>
      </div>
    {/if}
  </nav>
</header>

{#if data.user && legalNotices.length}
  <section class="legal-notices" aria-label={t('Legal updates')}>
    {#each legalNotices as notice (notice.document + notice.version)}
      <div class="legal-notice">
        <div>
          <strong>
            {notice.document === 'terms'
              ? t('Please review our Terms and Conditions')
              : t('Please review our Privacy Policy')}
          </strong>
          <p>
            {notice.document === 'terms'
              ? t(
                  'Review version {version}. You can accept it here after reading.',
                  { version: notice.version },
                )
              : t(
                  'Review version {version}. This acknowledgement confirms that you saw the notice.',
                  { version: notice.version },
                )}
          </p>
        </div>
        <div class="legal-actions">
          <a href={notice.href} target="_blank" rel="noopener">
            {t('Read document')}
          </a>
          <button
            type="button"
            disabled={savingLegalNotice ===
              `${notice.document}:${notice.version}`}
            onclick={() => confirmLegalNotice(notice)}
          >
            {notice.action === 'accepted' ? t('Accept') : t('Acknowledge')}
          </button>
        </div>
      </div>
    {/each}
    {#if legalNoticeError}
      <p class="legal-error" role="alert">{legalNoticeError}</p>
    {/if}
  </section>
{/if}

<main>
  {@render children()}
</main>

<footer class="shell-footer">
  <a href="/pricing">{t('Pricing')}</a>
  <a href="/legal/terms.md" target="_blank" rel="noopener">
    {t('Terms')}
  </a>
  <a href="/legal/privacy.md" target="_blank" rel="noopener">
    {t('Privacy')}
  </a>
</footer>

<style lang="scss">
  .shell-header {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid rgb(221 215 202 / 80%);
    background: rgb(255 253 249 / 88%);
    backdrop-filter: blur(18px);
  }
  nav {
    display: flex;
    gap: 28px;
    min-height: 72px;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 32px;
    align-items: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px 0 0;
    color: $color-text;
    font-size: 1rem;
    font-weight: 750;
    letter-spacing: -0.02em;
  }
  .brand-mark {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 12px 12px 12px 4px;
    background: $color-accent;
    color: white;
    font-family: Georgia, serif;
    font-size: 1.15rem;
  }
  .main-links,
  .account-links {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .account-links {
    margin-left: auto;
  }
  a {
    padding: 8px 12px;
    border-radius: $radius-sm;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: $color-text-muted;
    transition:
      color 0.15s,
      background 0.15s;

    &:hover {
      color: $color-text;
      background: $color-surface-2;
    }
    &.active {
      color: $color-text;
      background: #f9e9e1;
    }
  }
  .profile {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .avatar {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 50%;
    background: #dde7d8;
    color: #42634b;
    font-weight: 750;
  }
  button {
    padding: 8px 12px;
    border-radius: $radius-sm;
    border: 1px solid $color-border-strong;
    background: transparent;
    color: $color-text-muted;
    font-size: 0.875rem;
    cursor: pointer;
    &:hover {
      color: $color-text;
      background: $color-surface-2;
    }
  }
  main {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 40px 32px 64px;
  }
  .legal-notices {
    max-width: 1440px;
    margin: 20px auto 0;
    padding: 0 32px;
  }
  .legal-notice {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding: 16px 18px;
    border: 1px solid #d8b9a8;
    border-radius: $radius;
    background: #fff4ed;
  }
  .legal-notice p,
  .legal-error {
    margin: 4px 0 0;
    color: $color-text-muted;
    font-size: 0.875rem;
  }
  .legal-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-shrink: 0;

    a,
    button {
      padding: 8px 12px;
      border-radius: $radius-sm;
      font-size: 0.875rem;
      font-weight: 650;
    }

    a {
      color: $color-accent;
    }

    button {
      border: 0;
      background: $color-accent;
      color: white;
    }
  }
  .legal-error {
    color: $color-danger;
  }
  .shell-footer {
    display: flex;
    gap: 18px;
    justify-content: center;
    padding: 0 32px 32px;

    a {
      color: $color-text-muted;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 720px) {
    nav {
      min-height: 62px;
      gap: 12px;
      padding: 0 16px;
    }
    .brand > span:last-child,
    .email,
    form {
      display: none;
    }
    .account-links {
      margin-left: auto;
    }
    .main-links a {
      padding-inline: 9px;
    }
    main {
      padding: 24px 16px 48px;
    }
    .legal-notices {
      padding: 0 16px;
    }
    .legal-notice {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
