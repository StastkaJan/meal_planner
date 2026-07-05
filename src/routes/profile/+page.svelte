<script lang="ts">
  import { enhance } from "$app/forms";
  let { data, form } = $props();
</script>

<div class="profile-box">
  <h1>Profile</h1>
  <p class="email">{data.email}</p>

  <h2>Change password</h2>
  <form method="POST" use:enhance>
    {#if form?.error}<p class="error">{form.error}</p>{/if}
    {#if form?.success}<p class="success">Password updated.</p>{/if}
    <label
      >Current password <input type="password" name="current" required /></label
    >
    <label
      >New password <input
        type="password"
        name="next"
        required
        minlength="8"
      /></label
    >
    <button type="submit">Update password</button>
  </form>
</div>

<style lang="scss">
  .profile-box {
    max-width: 400px;
    padding: 32px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 1.25rem;
  }
  h2 {
    margin: 24px 0 16px;
    font-size: 1rem;
  }
  .email {
    color: $color-text-muted;
    font-size: 0.875rem;
    margin: 0 0 24px;
    border-bottom: 1px solid $color-border;
    padding-bottom: 24px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
    font-size: 0.875rem;
  }
  input {
    padding: 8px 12px;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: 0.875rem;
  }
  button {
    padding: 8px 20px;
    background: $color-accent;
    color: white;
    border: none;
    border-radius: $radius-sm;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  .error {
    color: #f87171;
    font-size: 0.875rem;
    margin-bottom: 12px;
  }
  .success {
    color: #4ade80;
    font-size: 0.875rem;
    margin-bottom: 12px;
  }
</style>
