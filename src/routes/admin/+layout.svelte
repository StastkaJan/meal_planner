<script lang="ts">
  import { page } from '$app/stores'
  import { useI18n } from '$lib/i18n-context'

  let { children } = $props()
  const { t } = useI18n()
</script>

<nav class="admin-nav" aria-label={t('Admin sections')}>
  <a
    href="/admin/recipes"
    class:active={$page.url.pathname.startsWith('/admin/recipes')}
    aria-current={$page.url.pathname.startsWith('/admin/recipes')
      ? 'page'
      : undefined}>{t('Recipes')}</a
  >
  <a
    href="/admin/users"
    class:active={$page.url.pathname.startsWith('/admin/users')}
    aria-current={$page.url.pathname.startsWith('/admin/users')
      ? 'page'
      : undefined}>{t('Users')}</a
  >
</nav>

{@render children()}

<style lang="scss">
  .admin-nav {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid $color-border;

    a {
      padding: 0.65rem 0.9rem;
      border-bottom: 2px solid transparent;
      color: $color-text-muted;
      text-decoration: none;

      &.active {
        border-color: $color-accent;
        color: $color-text;
        font-weight: 650;
      }
    }
  }
</style>
