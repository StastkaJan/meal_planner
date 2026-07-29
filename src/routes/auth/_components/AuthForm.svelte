<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import Input from '$lib/components/ui/Input.svelte'

  let {
    title,
    submitLabel,
    alternateHref,
    alternateLabel,
    error,
  }: {
    title: string
    submitLabel: string
    alternateHref: string
    alternateLabel: string
    error?: string
  } = $props()
</script>

<div class="auth-box">
  <h1>{title}</h1>
  <form method="POST">
    {#if error}<p class="error">{error}</p>{/if}
    <Field label="Email" for="email">
      <Input id="email" type="email" name="email" required />
    </Field>
    <Field label="Password" for="password">
      <Input
        id="password"
        type="password"
        name="password"
        required
        minlength={8}
      />
    </Field>
    <Button type="submit">{submitLabel}</Button>
  </form>
  <p><a href={alternateHref}>{alternateLabel}</a></p>
</div>

<style lang="scss">
  .auth-box {
    max-width: 360px;
    margin: 80px auto;
    padding: 32px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }

  h1 {
    margin: 0 0 24px;
    font-size: 1.25rem;
  }

  form {
    display: grid;
    gap: 16px;
  }

  form :global(.ui-button) {
    width: 100%;
  }

  .error {
    color: $color-danger;
    font-size: 0.875rem;
  }

  p {
    margin: 16px 0 0;
    font-size: 0.875rem;
    text-align: center;
  }

  a {
    color: $color-accent;
  }
</style>
