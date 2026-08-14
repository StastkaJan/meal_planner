<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import { recordPricingInterest } from '$lib/api/pricing'

  let selected = $state<'monthly' | 'annual' | null>(null)
  let saving = $state(false)
  let failed = $state(false)

  async function showInterest(billingInterval: 'monthly' | 'annual') {
    saving = true
    failed = false
    try {
      const response = await recordPricingInterest(billingInterval)
      if (!response.ok) throw new Error('Request failed')
      selected = billingInterval
    } catch {
      failed = true
    } finally {
      saving = false
    }
  }
</script>

<svelte:head>
  <title>Pricing | Meal Plan</title>
  <meta
    name="description"
    content="Compare Meal Plan Free and Pro, and tell us which Pro billing option you prefer."
  />
</svelte:head>

<div class="pricing-page">
  <header class="hero">
    <p class="eyebrow">Simple pricing</p>
    <h1>Plan meals your way today. Let Pro do more of the work tomorrow.</h1>
    <p class="intro">
      The essentials stay free. We are testing interest in one paid plan before
      building billing—choosing an option below will not charge you.
    </p>
  </header>

  <div class="plans">
    <section class="plan-card">
      <div>
        <p class="plan-name">Free</p>
        <p class="price">€0 <span>forever</span></p>
      </div>
      <ul>
        <li>Manual weekly planning</li>
        <li>Personal recipes</li>
        <li>Basic shopping list</li>
      </ul>
      <p class="current">Everything available today</p>
    </section>

    <section class="plan-card pro">
      <div>
        <p class="plan-name">Pro</p>
        <p class="price">From €6 <span>/ month</span></p>
      </div>
      <ul>
        <li>Automatic plan composition</li>
        <li>Nutrition-aware optimization</li>
        <li>Higher recipe import limits</li>
        <li>Enriched curated recipe catalogue</li>
      </ul>

      {#if selected}
        <div class="thanks" role="status">
          <strong>Thanks—that helps.</strong>
          <span>
            You prefer {selected === 'annual'
              ? 'annual billing'
              : 'monthly billing'}. No payment was taken.
          </span>
        </div>
      {:else}
        <div class="choices" aria-label="Preferred Pro billing">
          <Button disabled={saving} onclick={() => showInterest('monthly')}>
            I’d pay €8 monthly
          </Button>
          <Button
            variant="secondary"
            disabled={saving}
            onclick={() => showInterest('annual')}
          >
            I’d pay €72 annually
          </Button>
        </div>
        <p class="charge-note">Interest only. You will not be charged.</p>
        {#if failed}
          <p class="error" role="alert">
            Could not save your choice. Please try again.
          </p>
        {/if}
      {/if}
    </section>
  </div>
</div>

<style lang="scss">
  .pricing-page {
    display: grid;
    max-width: 980px;
    margin: 0 auto;
    gap: 36px;
  }
  .hero {
    max-width: 760px;
  }
  .eyebrow,
  .plan-name {
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h1 {
    margin-top: 6px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2.15rem, 5vw, 4rem);
    font-weight: 500;
    letter-spacing: -0.045em;
    line-height: 1.03;
  }
  .intro {
    max-width: 660px;
    margin-top: 18px;
    color: $color-text-muted;
    font-size: 1.05rem;
  }
  .plans {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 18px;
    align-items: stretch;
  }
  .plan-card {
    display: flex;
    min-height: 420px;
    padding: 30px;
    flex-direction: column;
    gap: 28px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 14px 36px rgb(41 39 33 / 5%);
  }
  .pro {
    border-color: rgb(168 68 37 / 45%);
    box-shadow: 0 18px 44px rgb(126 64 39 / 10%);
  }
  .price {
    margin-top: 6px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 2.25rem;
    line-height: 1;
  }
  .price span {
    color: $color-text-muted;
    font-family: inherit;
    font-size: 0.95rem;
  }
  ul {
    display: grid;
    gap: 12px;
    padding-left: 1.25rem;
    color: $color-text-muted;
  }
  li::marker {
    color: $color-accent;
  }
  .current,
  .choices,
  .thanks {
    margin-top: auto;
  }
  .current,
  .charge-note {
    color: $color-text-muted;
    font-size: 0.82rem;
  }
  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .charge-note {
    margin-top: -20px;
  }
  .thanks {
    display: grid;
    gap: 4px;
    padding: 16px;
    border-radius: $radius-sm;
    background: $color-accent-dim;
  }
  .thanks span {
    color: $color-text-muted;
    font-size: 0.88rem;
  }
  .error {
    color: $color-danger;
    font-size: 0.85rem;
  }
  @media (max-width: 720px) {
    .plans {
      grid-template-columns: 1fr;
    }
    .plan-card {
      min-height: auto;
    }
  }
  @media (max-width: 420px) {
    .choices {
      grid-template-columns: 1fr;
    }
  }
</style>
