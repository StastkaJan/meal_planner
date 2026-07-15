<script lang="ts">
  import PlanSettings from '$lib/components/PlanSettings.svelte'
  import { NUTRITION_TARGETS } from '$lib/constants'

  let { data } = $props()

  let targetsSaved = $state(false)
  let passwordError = $state('')
  let passwordSuccess = $state('')

  async function patchProfile(patch: object) {
    await fetch('/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  async function saveTargets(e: SubmitEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const body = Object.fromEntries(fd)
    await fetch('/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    targetsSaved = true
  }

  async function changePassword(e: SubmitEvent) {
    e.preventDefault()
    passwordError = ''
    passwordSuccess = ''
    const fd = new FormData(e.target as HTMLFormElement)
    const res = await fetch('/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        current: fd.get('current'),
        next: fd.get('next'),
      }),
    })
    const data = await res.json()
    if (data.error) passwordError = data.error
    else if (data.success) passwordSuccess = 'Password updated.'
  }
</script>

<div class="profile-box">
  <h1>Profile</h1>
  <p class="email">{data.email}</p>

  <h2>Meal preference defaults</h2>
  <p class="hint">
    New plans start with these cuisines and dietary restrictions.
  </p>
  <PlanSettings plan={data} onChange={patchProfile} />

  <h2>Nutrition targets</h2>
  <p class="hint">
    Daily goals for the calendar's nutrition bars and auto-compose. Blank uses
    the default.
  </p>
  <form method="POST" onsubmit={saveTargets}>
    {#if targetsSaved}<p class="success">Targets saved.</p>{/if}
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
    <button type="submit">Save targets</button>
  </form>

  <h2>Change password</h2>
  <form method="POST" onsubmit={changePassword}>
    {#if passwordError}<p class="error">{passwordError}</p>{/if}
    {#if passwordSuccess}<p class="success">{passwordSuccess}</p>{/if}
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
  .hint {
    color: $color-text-muted;
    font-size: 0.8rem;
    margin: 0 0 12px;
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
