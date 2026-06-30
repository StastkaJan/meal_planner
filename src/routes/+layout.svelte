<script lang="ts">
  import '../app.scss';
  import { page } from '$app/stores';

  let { children } = $props();
</script>

<nav>
  <a href="/" class:active={$page.url.pathname === '/'}>Plan</a>
  <a href="/meals" class:active={$page.url.pathname.startsWith('/meals')}>Meals</a>
</nav>

<main>
  {@render children()}
</main>

<style lang="scss">
  nav {
    display: flex;
    gap: 4px;
    padding: 12px 20px;
    border-bottom: 1px solid $color-border;
    background: $color-surface;
  }
  a {
    padding: 6px 14px;
    border-radius: $radius-sm;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: $color-text-muted;
    transition: color 0.15s, background 0.15s;

    &:hover { color: $color-text; background: $color-surface-2; }
    &.active { color: $color-text; background: $color-accent-dim; }
  }
  main {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
