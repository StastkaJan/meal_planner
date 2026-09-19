<script lang="ts">
  import { page } from '$app/state'
  import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '$lib/i18n'
  import { useI18n } from '$lib/i18n-context'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  const { t, label, locale } = useI18n()

  function languageUrl(language: Locale) {
    const url = new URL(page.url)
    url.searchParams.set('lang', language)
    return `${url.pathname}${url.search}${url.hash}`
  }
  const weekdays = $derived(
    Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale(), {
        weekday: 'short',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(2026, 8, 14 + i))),
    ),
  )
  const steps = [
    [
      'Keep your favourites close.',
      'Save your own recipes and discover shared ones. Build a collection you actually want to cook.',
    ],
    [
      'Give your week a little shape.',
      'Choose your meals, set portions for your household, and see how each day fits your nutrition goals.',
    ],
    [
      'Take one list to the shop.',
      'Turn your planned meals into a combined shopping list, with quantities for the people at your table.',
    ],
  ] as const
  const meals = [
    {
      slot: 'breakfast',
      name: 'Yoghurt, oats & berries',
      note: 'A gentle start',
      color: 'breakfast',
    },
    {
      slot: 'lunch',
      name: 'Roasted vegetable couscous',
      note: 'Colour on your plate',
      color: 'lunch',
    },
    {
      slot: 'dinner',
      name: 'Lemon chicken & potatoes',
      note: 'Something to look forward to',
      color: 'dinner',
    },
  ] as const
</script>

<svelte:head>
  <meta
    name="description"
    content={t(
      'Meet Papu Plan: your recipes, weekly meals, nutrition, and shopping list in one place. Less deciding, more enjoying everyday food.',
    )}
  />
</svelte:head>

<div class="landing">
  <div class="language-switcher" role="group" aria-label={t('Language')}>
    {#each SUPPORTED_LOCALES as language}
      <a
        href={languageUrl(language)}
        lang={language}
        hreflang={language}
        aria-current={locale() === language ? 'true' : undefined}
        data-sveltekit-reload>{LOCALE_LABELS[language]}</a
      >
    {/each}
  </div>
  <section class="hero" aria-labelledby="intro-heading">
    <div class="intro">
      <p class="eyebrow">
        <span aria-hidden="true">✳</span>
        {t('A little planning. A lot more living.')}
      </p>
      <h1 id="intro-heading">
        {t('Less deciding.')}<br /><em>{t('More enjoying.')}</em>
      </h1>
      <p class="lead">{t('Make room for the good part of food.')}</p>
      <p class="description">
        {t(
          'Papu Plan brings your recipes, weekly meals, nutrition, and shopping list together. So “what are we eating?” becomes one less thing on your mind.',
        )}
      </p>
      <div class="actions">
        <a class="button" href={data.user ? '/planner' : '/auth/register'}
          >{data.user ? t('Open planner') : t('Start planning for free')}
          <span aria-hidden="true">↗</span></a
        >
        <a class="button secondary" href="#how-it-works"
          >{t('See how it works')} <span aria-hidden="true">↓</span></a
        >
      </div>
      <p class="small-note">
        {t('Recipes, manual planning, and shopping lists. Free forever.')}
      </p>
    </div>

    <figure class="preview" aria-labelledby="preview-caption">
      <div class="planner-preview">
        <div class="preview-heading">
          <div>
            <p class="eyebrow">{t('A taste of your week')}</p>
            <h2>{t('Good food, planned.')}</h2>
          </div>
          <span class="sun" aria-hidden="true">☀</span>
        </div>
        <div class="week" aria-hidden="true">
          {#each weekdays as day, i}
            <span class:chosen={i === 0}>{day}<b>{14 + i}</b></span>
          {/each}
        </div>
        <div class="meals">
          {#each meals as meal}
            <div class="meal {meal.color}">
              <span class="meal-marker" aria-hidden="true"></span>
              <div>
                <p class="meal-slot">{label(meal.slot)}</p>
                <h3>{t(meal.name)}</h3>
                <p class="meal-note">{t(meal.note)}</p>
              </div>
              <span class="meal-check" aria-hidden="true">✓</span>
            </div>
          {/each}
        </div>
        <div class="list-note">
          <span aria-hidden="true">✓</span><span
            >{t('Your meals. One shopping list.')}</span
          >
        </div>
      </div>
      <figcaption id="preview-caption">
        {t('An example day. Make yours your own.')}
      </figcaption>
    </figure>
  </section>

  <section id="how-it-works" class="how" aria-labelledby="how-heading">
    <div class="section-heading">
      <p class="eyebrow">{t('From inspiration to dinner')}</p>
      <h2 id="how-heading">{t('A simpler rhythm for your week.')}</h2>
    </div>
    <div class="steps">
      {#each steps as [title, description], i}
        <article>
          <span class="step-number">0{i + 1}</span>
          <h3>{t(title)}</h3>
          <p>{t(description)}</p>
        </article>
      {/each}
    </div>
  </section>

  <section id="vision" class="vision" aria-labelledby="vision-heading">
    <div>
      <p class="eyebrow">{t('Our vision')}</p>
      <h2 id="vision-heading">
        {t('Everyday food.')}<br /><em>{t('Less everyday effort.')}</em>
      </h2>
    </div>
    <div class="vision-copy">
      <p class="vision-lead">
        {t('We believe eating well should fit into your life.')}
      </p>
      <p>
        {t(
          'Our vision is to make the everyday work around food feel lighter: fewer last-minute decisions, a clearer idea of what to buy, and more space to enjoy cooking and eating together.',
        )}
      </p>
      <p>
        {t(
          'A plan is a starting point. Keep your favourite meals, change your mind, and leave room for real life. Papu Plan is here to help you find a rhythm that works for you.',
        )}
      </p>
    </div>
  </section>

  <section class="closing" aria-labelledby="start-heading">
    <p class="eyebrow">{t('Start with your next meal')}</p>
    <h2 id="start-heading">
      {t('Your week, with one less thing to think about.')}
    </h2>
    <a class="button" href={data.user ? '/planner' : '/auth/register'}
      >{data.user ? t('Open planner') : t('Create your free account')}
      <span aria-hidden="true">↗</span></a
    >
    <p class="small-note">
      {t('Want a hand with the planning?')}
      <a href="/pricing">{t('Explore Free & Pro')}</a>
    </p>
  </section>
</div>

<style lang="scss">
  .landing {
    max-width: 1200px;
    margin: 0 auto;
  }
  .language-switcher {
    display: flex;
    width: fit-content;
    margin-left: auto;
    padding: 3px;
    gap: 3px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
  }
  .language-switcher a {
    padding: 11px 14px;
    border-radius: 7px;
    color: $color-text-muted;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
  }
  .language-switcher a:hover {
    background: $color-surface-2;
    color: $color-text;
  }
  .language-switcher a[aria-current='true'] {
    background: $color-accent;
    color: white;
  }
  .hero {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    align-items: center;
    gap: 64px;
    padding: 36px 0 76px;
  }
  .eyebrow {
    color: $color-accent;
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .intro > .eyebrow {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .intro > .eyebrow span {
    font-size: 1.5rem;
  }
  h1,
  h2 {
    font-family: Georgia, serif;
    font-weight: 400;
    letter-spacing: -0.045em;
    line-height: 1.08;
  }
  h1 {
    margin: 22px 0 26px;
    font-size: clamp(3.2rem, 5.5vw, 5rem);
  }
  em {
    color: $color-accent;
    font-weight: 400;
  }
  .lead {
    margin-bottom: 12px;
    font-size: 1.22rem;
    font-weight: 550;
  }
  .description {
    max-width: 480px;
    color: $color-text-muted;
    font-size: 1.03rem;
    line-height: 1.75;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 22px;
    margin: 28px 0 14px;
  }
  .button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
    min-height: 48px;
    padding: 14px 22px;
    border-radius: $radius-sm;
    background: $color-accent;
    color: white;
    font-size: 0.9rem;
    font-weight: 650;
    text-decoration: none;
    transition: background 0.15s;
  }
  .button:hover {
    background: #89371e;
  }
  .button.secondary {
    gap: 12px;
    background: $color-surface;
    color: $color-accent;
    box-shadow: inset 0 0 0 1px $color-accent;
  }
  .button.secondary:hover,
  .button.secondary:focus-visible {
    background: $color-accent-dim;
  }
  .small-note {
    color: $color-text-muted;
    font-size: 0.76rem;
    line-height: 1.6;
  }
  .preview {
    position: relative;
    padding: 22px 16px 0;
    border-radius: 48% 48% 24px 24px;
    background: #e9ddca;
  }
  .planner-preview {
    padding: 26px;
    border: 1px solid #d6cdbf;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 20px 45px rgb(63 46 25 / 9%);
    transform: rotate(2deg);
  }
  .preview-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .preview-heading h2 {
    margin-top: 8px;
    font-size: 1.9rem;
  }
  .sun {
    color: $color-accent;
    font-size: 2.6rem;
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    margin: 24px 0;
  }
  .week span {
    display: grid;
    gap: 7px;
    padding: 9px 2px;
    border-radius: 22px;
    text-align: center;
    color: $color-text-muted;
    font-size: 0.65rem;
  }
  .week b {
    color: $color-text;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .week .chosen {
    background: $color-accent;
    color: white;
  }
  .week .chosen b {
    color: white;
  }
  .meals {
    display: grid;
    gap: 10px;
  }
  .meal {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 12px;
    border-radius: 12px;
  }
  .breakfast {
    background: #faf0dc;
    --meal-color: #925a10;
  }
  .lunch {
    background: #e9efdf;
    --meal-color: #537147;
  }
  .dinner {
    background: #f3e5de;
    --meal-color: #a84425;
  }
  .meal-marker {
    flex-shrink: 0;
    width: 4px;
    height: 40px;
    border-radius: 4px;
    background: var(--meal-color);
  }
  .meal-slot {
    color: var(--meal-color);
    font-size: 0.65rem;
    font-weight: 750;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .meal h3 {
    margin: 3px 0;
    font-size: 0.86rem;
    font-weight: 650;
  }
  .meal-note {
    color: $color-text-muted;
    font-size: 0.7rem;
  }
  .meal-check {
    margin-left: auto;
    color: var(--meal-color);
  }
  .list-note {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e9e2d6;
    color: #42634b;
    font-size: 0.78rem;
  }
  figcaption {
    padding: 18px 0 12px;
    text-align: center;
    color: $color-text-muted;
    font-size: 0.7rem;
  }
  .how {
    padding: 56px 0 64px;
    border-top: 1px solid $color-border;
  }
  section[id] {
    scroll-margin-top: 110px;
  }
  .section-heading h2 {
    margin-top: 12px;
    font-size: clamp(2rem, 3.5vw, 3rem);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px;
    margin-top: 40px;
  }
  .step-number {
    color: $color-accent;
    font-family: Georgia, serif;
    font-size: 1.4rem;
    font-style: italic;
  }
  .steps h3 {
    margin: 14px 0 10px;
    font-size: 1.05rem;
    font-weight: 650;
  }
  .steps p,
  .vision-copy p {
    color: $color-text-muted;
    font-size: 0.95rem;
    line-height: 1.75;
  }
  .vision {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 56px;
    padding: 48px;
    border-radius: 24px;
    background: #e6ebdf;
  }
  .vision .eyebrow,
  .vision em {
    color: #42634b;
  }
  .vision h2 {
    margin-top: 22px;
    font-size: clamp(2.2rem, 3.8vw, 3.35rem);
  }
  .vision-copy p + p {
    margin-top: 16px;
  }
  .vision-copy .vision-lead {
    color: $color-text;
    font-size: 1.12rem;
    font-weight: 600;
  }
  .closing {
    max-width: 680px;
    margin: 0 auto;
    padding: 96px 0 48px;
    text-align: center;
  }
  .closing h2 {
    margin: 16px 0 28px;
    font-size: clamp(2.2rem, 4vw, 3.5rem);
  }
  .closing .small-note {
    margin-top: 18px;
  }
  .small-note a {
    text-underline-offset: 3px;
  }
  @media (max-width: 1000px) {
    .hero {
      gap: 30px;
    }
    .planner-preview {
      padding: 18px;
    }
    .vision {
      padding: 32px;
      gap: 32px;
    }
  }
  @media (max-width: 720px) {
    .hero {
      grid-template-columns: 1fr;
      gap: 36px;
      padding: 12px 0 42px;
    }
    h1 {
      font-size: clamp(3.05rem, 10vw, 4.5rem);
    }
    .preview {
      width: 100%;
      max-width: 460px;
      justify-self: center;
    }
    .planner-preview {
      transform: rotate(1deg);
    }
    .how {
      padding: 36px 0;
    }
    .steps {
      grid-template-columns: 1fr;
      gap: 26px;
      margin-top: 28px;
    }
    .steps article {
      padding-left: 44px;
      position: relative;
    }
    .step-number {
      position: absolute;
      left: 0;
      top: 8px;
    }
    .vision {
      grid-template-columns: 1fr;
      padding: 28px 22px;
      gap: 24px;
    }
    .closing {
      padding-top: 64px;
    }
  }
</style>
