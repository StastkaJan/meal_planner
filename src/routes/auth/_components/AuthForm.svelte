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
  <div class="auth-mark">M</div>
  <h1>{title}</h1>
  <p class="intro">Plan better meals, one week at a time.</p>
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
    max-width: 420px;
    margin: 7vh auto;
    padding: 38px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 24px 70px rgb(41 39 33 / 10%);
  }

  .auth-mark {
    display: grid;
    width: 44px;
    height: 44px;
    margin-bottom: 22px;
    place-items: center;
    border-radius: 15px 15px 15px 5px;
    background: $color-accent;
    color: white;
    font-family: Georgia, serif;
    font-size: 1.4rem;
  }

  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 2rem;
    font-weight: 500;
    letter-spacing: -0.03em;
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

  .intro {
    margin: 5px 0 26px;
    color: $color-text-muted;
    text-align: left;
  }

  a {
    color: $color-accent;
    font-weight: 600;
  }

  @media (max-width: 480px) {
    .auth-box {
      margin: 3vh auto;
      padding: 26px;
    }
  }
</style>
