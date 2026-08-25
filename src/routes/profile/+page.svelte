<script lang="ts">
  import { goto } from '$app/navigation'
  import { NUTRITION_TARGETS } from '$lib/domain/nutrition'
  import {
    changePassword as updatePassword,
    deleteAccount,
    updateProfile,
  } from '$lib/api/profile'
  import { LOCALE_LABELS, SUPPORTED_LOCALES } from '$lib/i18n'

  let { data } = $props()

  let targetsSaved = $state(false)
  let passwordError = $state('')
  let passwordSuccess = $state('')
  let deletionError = $state('')

  async function saveTargets(e: SubmitEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const body = Object.fromEntries(fd)
    await updateProfile(body)
    targetsSaved = true
  }

  async function saveLanguage(e: SubmitEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    await updateProfile({ locale: fd.get('locale') })
    await goto('/profile')
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

  async function removeAccount(e: SubmitEvent) {
    e.preventDefault()
    deletionError = ''
    const fd = new FormData(e.target as HTMLFormElement)
    const result = await deleteAccount(
      fd.get('password'),
      fd.get('confirmation'),
    )
    if (result.error) deletionError = result.error
    else if (result.success) await goto('/auth/login')
  }
</script>

<div class="profile-page">
  <header>
    <p class="eyebrow">Your account</p>
    <h1>Profile</h1>
    <p class="email">{data.email}</p>
  </header>

  <div class="settings-grid">
    <section class="card">
      <h2>Language</h2>
      <p class="hint">Used to select available recipe translations.</p>
      <form method="POST" onsubmit={saveLanguage}>
        <label>
          Preferred language
          <select name="locale" value={data.locale}>
            {#each SUPPORTED_LOCALES as locale}
              <option value={locale}>{LOCALE_LABELS[locale]}</option>
            {/each}
          </select>
        </label>
        <button type="submit">Save language</button>
      </form>
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

    <section class="card data-card">
      <h2>Your data</h2>
      <p class="hint">
        Download a JSON copy of your profile settings, personal recipes, plans,
        favourites, and recipe submissions.
      </p>
      <a class="download" href="/profile/export" download>Download my data</a>
    </section>

    <section class="card danger-card">
      <h2>Delete account</h2>
      <p class="hint">
        Permanently deletes your sessions, settings, recipes, plans, and other
        personal data. Shared recipes stay in the catalogue. This cannot be
        undone.
      </p>
      <form method="POST" onsubmit={removeAccount}>
        {#if deletionError}<p class="error">{deletionError}</p>{/if}
        <label
          >Password <input type="password" name="password" required /></label
        >
        <label
          >Type {data.email} to confirm
          <input
            type="email"
            name="confirmation"
            required
            autocomplete="off"
          /></label
        >
        <button class="danger" type="submit"
          >Delete my account permanently</button
        >
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
    grid-template-columns: 1fr 1fr;
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
  .danger-card {
    grid-column: 1 / -1;
    border-color: color-mix(in srgb, $color-danger 35%, $color-border);
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
  input,
  select {
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
  .download {
    display: inline-block;
    min-height: 40px;
    padding: 9px 18px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: 0.875rem;
    font-weight: 650;
    text-decoration: none;
  }
  button.danger {
    background: $color-danger;
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
