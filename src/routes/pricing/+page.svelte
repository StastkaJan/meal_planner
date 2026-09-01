<script lang="ts">
  import { useI18n } from '$lib/i18n-context'

  const { t } = useI18n()
</script>

<svelte:head>
  <meta
    name="description"
    content={t(
      'Start with all the essentials for free. Pro adds time-saving automation when you need it.',
    )}
  />
</svelte:head>

<div class="pricing-page">
  <header>
    <p class="eyebrow">{t('Plans & pricing')}</p>
    <h1>{t('Simple plans for better weekly meals.')}</h1>
    <p class="subtitle">
      {t(
        'Start with all the essentials for free. Pro adds time-saving automation when you need it.',
      )}
    </p>
  </header>

  <div class="plans">
    <section class="plan-card">
      <p class="plan-label">{t('Free plan')}</p>
      <h2>{t('Free forever')}</h2>
      <ul>
        <li>{t('Manual weekly planning')}</li>
        <li>{t('Personal and shared recipes')}</li>
        <li>{t('Favourites and shopping lists')}</li>
        <li>{t('Nutrition tracking')}</li>
      </ul>
    </section>

    <section class="plan-card pro">
      <p class="plan-label">{t('Pro plan')}</p>
      <h2>{t('Coming soon')}</h2>
      <ul>
        <li>{t('Everything in Free')}</li>
        <li>{t('Import recipes from a URL')}</li>
        <li>{t('Automatic plan composition')}</li>
        <li>{t('Copy a previous week')}</li>
        <li>{t('Recalculate a day around extras')}</li>
      </ul>
    </section>
  </div>

  <aside>
    {t(
      'Pro checkout is not available yet. During preview, administrators can grant access from user management.',
    )}
  </aside>

  <a class="cta" href="/">{t('Start planning')}</a>
</div>

<style lang="scss">
  .pricing-page {
    display: grid;
    max-width: 920px;
    margin: 0 auto;
    gap: 28px;
  }
  header {
    max-width: 680px;
  }
  .eyebrow,
  .plan-label {
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    margin-top: 6px;
    font-family: Georgia, serif;
    font-size: clamp(2.25rem, 6vw, 4.5rem);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .subtitle {
    max-width: 620px;
    margin-top: 16px;
    color: $color-text-muted;
    font-size: 1.05rem;
  }
  .plans {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
  .plan-card {
    padding: 28px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 14px 36px rgb(41 39 33 / 5%);
  }
  .plan-card.pro {
    border-color: color-mix(in srgb, $color-accent 45%, $color-border);
  }
  h2 {
    margin: 6px 0 18px;
    font-family: Georgia, serif;
    font-size: 1.75rem;
    font-weight: 500;
  }
  ul {
    display: grid;
    gap: 10px;
    padding-left: 1.2rem;
    color: $color-text-muted;
  }
  aside {
    padding: 16px 18px;
    border: 1px solid #d8b9a8;
    border-radius: $radius;
    background: #fff4ed;
    color: $color-text-muted;
  }
  .cta {
    justify-self: start;
    padding: 10px 18px;
    border-radius: $radius-sm;
    background: $color-accent;
    color: white;
    font-weight: 650;
    text-decoration: none;
  }
  @media (max-width: 680px) {
    .plans {
      grid-template-columns: 1fr;
    }
  }
</style>
