<script lang="ts">
  import '../app.scss'
  import * as Sentry from '@sentry/sveltekit'
  import { page } from '$app/stores'

  let { children, data } = $props()

  $effect(() => {
    Sentry.setUser(data.user ? { id: String(data.user.id) } : null)
  })
</script>

<header class="shell-header">
  <nav aria-label="Main navigation">
    <a class="brand" href="/" aria-label="Meal Plan home">
      <span class="brand-mark">M</span>
      <span>Meal Plan</span>
    </a>
    {#if data.user}
      <div class="main-links">
        <a href="/" class:active={$page.url.pathname === '/'}>Planner</a>
        <a href="/meals" class:active={$page.url.pathname.startsWith('/meals')}
          >Recipes</a
        >
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
          <button type="submit">Sign out</button>
        </form>
      </div>
    {/if}
  </nav>
</header>

<main>
  {@render children()}
</main>

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
      background: $color-accent-dim;
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
  }
</style>
