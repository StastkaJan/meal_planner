<script lang="ts">
  import '../app.scss'
  import { page } from '$app/stores'

  let { children, data } = $props()
</script>

<nav>
  <a href="/" class:active={$page.url.pathname === '/'}>Plan</a>
  <a href="/meals" class:active={$page.url.pathname.startsWith('/meals')}
    >Meals</a
  >
  <span class="spacer"></span>
  {#if data.user}
    <a href="/profile" class:active={$page.url.pathname === '/profile'}
      >{data.user.email}</a
    >
    <form method="POST" action="/auth/logout">
      <button type="submit">Sign out</button>
    </form>
  {/if}
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
    align-items: center;
  }
  .spacer {
    flex: 1;
  }
  a {
    padding: 6px 14px;
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
      background: $color-accent-dim;
    }
  }
  button {
    padding: 6px 14px;
    border-radius: $radius-sm;
    border: 1px solid $color-border;
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
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
