<script lang="ts">
  let { form } = $props();
</script>

<div class="auth-box">
  <h1>Sign in</h1>
  <form method="POST">
    {#if form?.error}<p class="error">{form.error}</p>{/if}
    <label>Email <input type="email" name="email" required /></label>
    <label>Password <input type="password" name="password" required minlength="8" /></label>
    <button type="submit">Sign in</button>
  </form>
  <p><a href="/auth/register">Create account</a></p>
</div>

<style lang="scss">
  .auth-box {
    max-width: 360px;
    margin: 80px auto;
    padding: 32px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
  }
  h1 { margin: 0 0 24px; font-size: 1.25rem; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; font-size: 0.875rem; }
  input {
    padding: 8px 12px;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: 0.875rem;
  }
  button {
    width: 100%;
    padding: 10px;
    background: $color-accent;
    color: white;
    border: none;
    border-radius: $radius-sm;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  .error { color: #f87171; font-size: 0.875rem; margin-bottom: 12px; }
  p { margin: 16px 0 0; font-size: 0.875rem; text-align: center; }
  a { color: $color-accent; }
</style>
