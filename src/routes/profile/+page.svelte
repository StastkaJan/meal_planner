<script lang="ts">
  import PreferenceSettings from './_components/PreferenceSettings.svelte'
  import { NUTRITION_TARGETS } from '$lib/domain/nutrition'
  import {
    changePassword as updatePassword,
    updateProfile,
  } from '$lib/api/profile'

  let { data } = $props()

  let targetsSaved = $state(false)
  let passwordError = $state('')
  let passwordSuccess = $state('')

  async function patchProfile(patch: object) {
    await updateProfile(patch)
  }

  async function saveTargets(e: SubmitEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const body = Object.fromEntries(fd)
    await updateProfile(body)
    targetsSaved = true
  }

  async function changePassword(e: SubmitEvent) {
    e.preventDefault()
    passwordError = ''
    passwordSuccess = ''
    const fd = new FormData(e.target as HTMLFormElement)
    const data = await updatePassword(fd.get('current'), fd.get('next'))
    if (data.error) passwordError = data.error
    else if (data.success) passwordSuccess = 'Password updated.'
  }
</script>

<div class="profile-page">
  <header>
    <p class="eyebrow">Your account</p>
    <h1>Profile</h1>
    <p class="email">{data.email}</p>
  </header>

  <div class="settings-grid">
    <section class="card preferences-card">
      <h2>Meal preference defaults</h2>
      <p class="hint">
        New plans start with these cuisines and dietary restrictions.
      </p>
      <PreferenceSettings
        cuisinePrefs={data.cuisinePrefs}
        dietaryRestrictions={data.dietaryRestrictions}
        onChange={patchProfile}
      />
    </section>

    <section class="card">
      <h2>Nutrition targets</h2>
      <p class="hint">
        Daily goals for nutrition bars and auto-compose. Blank uses the default.
      </p>
      <form class="nutrition-form" method="POST" onsubmit={saveTargets}>
        {#if targetsSaved}<p class="success">Targets saved.</p>{/if}
        <div class="target-grid">
          <label
            >Calories (kcal) <input
              type="number"
              min="1"
              name="calorieTarget"
              value={data.calorieTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.calories)}
            /></label
          >
          <label
            >Protein (g) <input
              type="number"
              min="1"
              name="proteinTarget"
              value={data.proteinTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.proteinG)}
            /></label
          >
          <label
            >Carbs (g) <input
              type="number"
              min="1"
              name="carbsTarget"
              value={data.carbsTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.carbsG)}
            /></label
          >
          <label
            >Fat (g) <input
              type="number"
              min="1"
              name="fatTarget"
              value={data.fatTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.fatG)}
            /></label
          >
        </div>
        <button type="submit">Save targets</button>
      </form>
    </section>

    <section class="card security-card">
      <h2>Change password</h2>
      <p class="hint">Use at least eight characters.</p>
      <form method="POST" onsubmit={changePassword}>
        {#if passwordError}<p class="error">{passwordError}</p>{/if}
        {#if passwordSuccess}<p class="success">{passwordSuccess}</p>{/if}
        <label
          >Current password <input
            type="password"
            name="current"
            required
          /></label
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
    </section>
  </div>
</div>

<style lang="scss">
  .profile-page {
    max-width: 980px;
    display: grid;
    gap: 28px;
  }
  .eyebrow {
    margin-bottom: 4px;
    color: $color-accent;
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }
  h2 {
    margin-bottom: 6px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.25rem;
    font-weight: 500;
  }
  .email {
    color: $color-text-muted;
    font-size: 0.875rem;
    margin-top: 8px;
  }
  .settings-grid {
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 18px;
    align-items: start;
  }
  .card {
    padding: 24px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 14px 36px rgb(41 39 33 / 5%);
  }
  .preferences-card {
    grid-row: span 2;
  }
  .hint {
    color: $color-text-muted;
    font-size: 0.83rem;
    margin: 0 0 18px;
  }
  form {
    display: grid;
    gap: 14px;
  }
  .target-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875rem;
    font-weight: 600;
    color: $color-text-muted;
  }
  input {
    min-height: 42px;
    padding: 9px 11px;
    background: $color-surface;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: 0.875rem;
  }
  button {
    justify-self: start;
    min-height: 40px;
    padding: 9px 18px;
    background: $color-accent;
    color: white;
    border: none;
    border-radius: $radius-sm;
    font-size: 0.875rem;
    font-weight: 650;
    cursor: pointer;
  }
  .error {
    color: $color-danger;
    font-size: 0.875rem;
    margin-bottom: 12px;
  }
  .success {
    color: #397449;
    font-size: 0.875rem;
    margin-bottom: 12px;
  }
  @media (max-width: 760px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }
    .preferences-card {
      grid-row: auto;
    }
  }
  @media (max-width: 420px) {
    .card {
      padding: 20px;
    }
    .target-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
