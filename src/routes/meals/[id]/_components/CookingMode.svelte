<script lang="ts">
  import { onMount } from 'svelte'
  import { cookingSteps, formatTimer } from '$lib/domain/cooking'
  import type { IngredientInput } from '$lib/types'
  import { useI18n } from '$lib/i18n-context'

  const { t, label } = useI18n()

  type Timer = {
    id: number
    remaining: number
    endsAt: number | null
  }

  let {
    name,
    instructions,
    ingredients,
    baseServings,
    servings = $bindable(),
    closeHref,
  }: {
    name: string
    instructions: string
    ingredients: IngredientInput[]
    baseServings: number
    servings: number
    closeHref: string
  } = $props()

  const steps = $derived(cookingSteps(instructions))
  let step = $state(0)
  let timerMinutes = $state(5)
  let timers = $state<Timer[]>([])
  let nextTimerId = 1
  let wakeStatus = $state<'active' | 'inactive' | 'unsupported'>('inactive')

  const scaledQty = (qty: number) =>
    Number(((qty * servings) / baseServings).toFixed(2))

  function addTimer() {
    const seconds = Math.round(timerMinutes * 60)
    if (seconds < 1) return
    timers = [
      ...timers,
      {
        id: nextTimerId++,
        remaining: seconds,
        endsAt: Date.now() + seconds * 1000,
      },
    ]
  }

  function toggleTimer(timer: Timer) {
    const remaining = timer.endsAt
      ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
      : timer.remaining
    timers = timers.map((item) =>
      item.id === timer.id
        ? {
            ...item,
            remaining,
            endsAt:
              timer.endsAt || remaining === 0
                ? null
                : Date.now() + remaining * 1000,
          }
        : item,
    )
  }

  onMount(() => {
    let wakeLock: { release: () => Promise<void> } | null = null

    async function keepScreenAwake() {
      if (!('wakeLock' in navigator)) {
        wakeStatus = 'unsupported'
        return
      }
      try {
        wakeLock = await navigator.wakeLock.request('screen')
        wakeStatus = 'active'
      } catch {
        wakeStatus = 'inactive'
      }
    }

    function restoreWakeLock() {
      if (document.visibilityState === 'visible') void keepScreenAwake()
    }

    void keepScreenAwake()
    document.addEventListener('visibilitychange', restoreWakeLock)
    const interval = window.setInterval(() => {
      const now = Date.now()
      timers = timers.map((timer) => {
        if (!timer.endsAt) return timer
        const remaining = Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
        return { ...timer, remaining, endsAt: remaining ? timer.endsAt : null }
      })
    }, 250)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', restoreWakeLock)
      void wakeLock?.release()
    }
  })
</script>

<div class="cooking-mode">
  <header>
    <div>
      <p class="eyebrow">{t('Cooking mode')}</p>
      <h1>{name}</h1>
    </div>
    <div class="header-actions">
      <span class="wake" title={t('Screen wake lock status')}>
        {wakeStatus === 'active'
          ? t('Screen awake')
          : wakeStatus === 'unsupported'
            ? t('Wake lock unavailable')
            : t('Wake lock inactive')}
      </span>
      <a class="close" href={closeHref} aria-label={t('Close cooking mode')}
        >{t('Close')}</a
      >
    </div>
  </header>

  <div class="cooking-content">
    <aside>
      <div class="servings">
        <strong>{t('Ingredients for {count}', { count: servings })}</strong>
        <div>
          <button
            type="button"
            aria-label={t('Fewer cooking servings')}
            onclick={() => (servings = Math.max(1, servings - 1))}>−</button
          >
          <span>{servings}</span>
          <button
            type="button"
            aria-label={t('More cooking servings')}
            onclick={() => (servings += 1)}>+</button
          >
        </div>
      </div>
      {#if ingredients.length}
        <ul>
          {#each ingredients as ingredient}
            <li>
              {ingredient.qty !== null
                ? `${scaledQty(ingredient.qty)}${ingredient.unit ? ` ${label(ingredient.unit)}` : ''} `
                : ''}{ingredient.name}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">{t('No ingredients listed.')}</p>
      {/if}
    </aside>

    <section class="step" aria-live="polite">
      <p class="progress">
        {t('Step {step} of {count}', { step: step + 1, count: steps.length })}
      </p>
      <p class="instruction">{steps[step]}</p>
      <nav aria-label={t('Cooking steps')}>
        <button type="button" disabled={step === 0} onclick={() => step--}
          >{t('Previous')}</button
        >
        <button
          class="primary"
          type="button"
          disabled={step === steps.length - 1}
          onclick={() => step++}>{t('Next step')}</button
        >
      </nav>
    </section>

    <aside class="timer-panel">
      <h2>{t('Timers')}</h2>
      <form
        onsubmit={(event) => {
          event.preventDefault()
          addTimer()
        }}
      >
        <label>
          {t('Minutes')}
          <input type="number" min="0.1" step="0.1" bind:value={timerMinutes} />
        </label>
        <button class="primary" type="submit">{t('Start timer')}</button>
      </form>
      <div class="timers">
        {#each timers as timer}
          <div class:done={timer.remaining === 0} class="timer">
            <strong
              >{timer.remaining === 0
                ? t("Time's up")
                : formatTimer(timer.remaining)}</strong
            >
            <div>
              <button type="button" onclick={() => toggleTimer(timer)}>
                {timer.endsAt
                  ? t('Pause')
                  : timer.remaining
                    ? t('Resume')
                    : t('Done')}
              </button>
              <button
                type="button"
                aria-label={t('Remove timer')}
                onclick={() =>
                  (timers = timers.filter((item) => item.id !== timer.id))}
                >{t('Remove')}</button
              >
            </div>
          </div>
        {/each}
      </div>
    </aside>
  </div>
</div>

<style lang="scss">
  .cooking-mode {
    position: fixed;
    inset: 0;
    z-index: 100;
    overflow: auto;
    padding: clamp(18px, 3vw, 42px);
    background: #f6f3ec;
    color: $color-text;
  }
  header {
    display: flex;
    max-width: 1400px;
    margin: 0 auto 28px;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }
  .eyebrow,
  .progress {
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h1 {
    font-family: Georgia, serif;
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 500;
    line-height: 1.1;
  }
  h2 {
    margin-bottom: 12px;
    font-family: Georgia, serif;
    font-weight: 500;
  }
  .header-actions,
  .servings,
  .servings div,
  nav,
  .timer,
  .timer div {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .wake {
    color: $color-text-muted;
    font-size: 0.8rem;
  }
  .close,
  button {
    min-height: 42px;
    padding: 8px 14px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    cursor: pointer;
    text-decoration: none;
  }
  button:disabled {
    cursor: default;
    opacity: 0.45;
  }
  .primary {
    border-color: $color-accent;
    background: $color-accent;
    color: white;
  }
  .cooking-content {
    display: grid;
    max-width: 1400px;
    margin: 0 auto;
    grid-template-columns: minmax(230px, 0.8fr) minmax(320px, 2fr) minmax(
        220px,
        0.8fr
      );
    gap: 20px;
    align-items: start;
  }
  aside,
  .step {
    padding: clamp(18px, 2.5vw, 30px);
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }
  .servings {
    margin-bottom: 16px;
    justify-content: space-between;
  }
  .servings button {
    min-width: 42px;
    padding: 6px;
  }
  ul {
    display: flex;
    padding-left: 1.2rem;
    flex-direction: column;
    gap: 9px;
    line-height: 1.5;
  }
  .muted {
    color: $color-text-muted;
  }
  .step {
    min-height: 420px;
    display: flex;
    flex-direction: column;
  }
  .instruction {
    margin: auto 0;
    font-family: Georgia, serif;
    font-size: clamp(1.8rem, 4vw, 3.5rem);
    line-height: 1.25;
  }
  nav {
    margin-top: 30px;
    justify-content: space-between;
  }
  .timer-panel form {
    display: flex;
    gap: 8px;
    align-items: end;
  }
  label {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    color: $color-text-muted;
    font-size: 0.8rem;
  }
  input {
    width: 100%;
    min-height: 42px;
    padding: 8px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
  }
  .timers {
    display: flex;
    margin-top: 16px;
    flex-direction: column;
    gap: 8px;
  }
  .timer {
    padding: 12px;
    justify-content: space-between;
    border-radius: $radius-sm;
    background: $color-surface-2;
  }
  .timer.done {
    background: $color-accent-dim;
  }
  .timer button {
    min-height: 32px;
    padding: 4px 7px;
    font-size: 0.75rem;
  }
  @media (max-width: 980px) {
    .cooking-content {
      grid-template-columns: 1fr 2fr;
    }
    .timer-panel {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 680px) {
    header,
    .cooking-content {
      display: flex;
      flex-direction: column;
    }
    .header-actions {
      width: 100%;
      justify-content: space-between;
    }
    aside,
    .step,
    .timer-panel {
      width: 100%;
    }
    .step {
      min-height: 360px;
      order: -1;
    }
  }
</style>
