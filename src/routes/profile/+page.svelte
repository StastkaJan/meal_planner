<script lang="ts">
  import { goto } from '$app/navigation'
  import { NUTRITION_TARGETS } from '$lib/domain/nutrition'
  import {
    changePassword as updatePassword,
    deleteAccount,
    updateProfile,
  } from '$lib/api/profile'
  import { LOCALE_LABELS, SUPPORTED_LOCALES } from '$lib/i18n'
  import { useI18n } from '$lib/i18n-context'
  import {
    acceptInvitation,
    addMember,
    createHousehold,
    declineInvitation,
    leaveHousehold,
    removeMember,
    updateMember,
  } from '$lib/api/household'

  let { data } = $props()
  const { t, message } = useI18n()

  let targetsSaved = $state(false)
  let pantrySaved = $state(false)
  let pantryError = $state('')
  let passwordError = $state('')
  let passwordSuccess = $state('')
  let deletionError = $state('')
  let householdError = $state('')

  async function refreshHousehold() {
    await goto(`/profile?household=${Date.now()}`)
  }

  async function createHouseholdFromForm(event: SubmitEvent) {
    event.preventDefault()
    householdError = ''
    const name = new FormData(event.currentTarget as HTMLFormElement).get(
      'name',
    )
    try {
      await createHousehold(String(name ?? ''))
      await refreshHousehold()
    } catch (error) {
      householdError = error instanceof Error ? error.message : 'Request failed'
    }
  }

  async function addMemberFromForm(event: SubmitEvent) {
    event.preventDefault()
    householdError = ''
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const response = await addMember(
      String(data.get('email') ?? ''),
      data.get('canEdit') === 'on',
    )
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      householdError = body.message ?? 'Request failed'
      return
    }
    await refreshHousehold()
  }

  async function changeMemberPermission(userId: number, canEdit: boolean) {
    const response = await updateMember(userId, canEdit)
    if (response.ok) await refreshHousehold()
  }

  async function deleteMember(userId: number) {
    if (!confirm('Remove this household member?')) return
    const response = await removeMember(userId)
    if (response.ok) await refreshHousehold()
  }

  async function respondToInvitation(householdId: number, accept: boolean) {
    householdError = ''
    const response = accept
      ? await acceptInvitation(householdId)
      : await declineInvitation(householdId)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      householdError = body.message ?? 'Request failed'
      return
    }
    await refreshHousehold()
  }

  async function leaveCurrentHousehold() {
    if (!confirm('Leave this household?')) return
    const response = await leaveHousehold()
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      householdError = body.message ?? 'Request failed'
      return
    }
    await refreshHousehold()
  }

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
    location.reload()
  }

  async function savePantry(e: SubmitEvent) {
    e.preventDefault()
    pantrySaved = false
    pantryError = ''
    const fd = new FormData(e.target as HTMLFormElement)
    try {
      await updateProfile({ pantryStaples: fd.get('pantryStaples') })
      pantrySaved = true
    } catch (error) {
      pantryError = message(
        error instanceof Error ? error.message : 'Request failed',
      )
    }
  }

  async function changePassword(e: SubmitEvent) {
    e.preventDefault()
    passwordError = ''
    passwordSuccess = ''
    const fd = new FormData(e.target as HTMLFormElement)
    const data = await updatePassword(fd.get('current'), fd.get('next'))
    if (data.error) passwordError = message(data.error)
    else if (data.success) passwordSuccess = t('Password updated.')
  }

  async function removeAccount(e: SubmitEvent) {
    e.preventDefault()
    deletionError = ''
    const fd = new FormData(e.target as HTMLFormElement)
    const result = await deleteAccount(
      fd.get('password'),
      fd.get('confirmation'),
    )
    if (result.error) deletionError = message(result.error)
    else if (result.success) await goto('/auth/login')
  }
</script>

<div class="profile-page">
  <header>
    <p class="eyebrow">{t('Your account')}</p>
    <h1>{t('Profile')}</h1>
    <p class="email">{data.email}</p>
  </header>

  <div class="settings-grid">
    <section class="card">
      <h2>{t('Language')}</h2>
      <p class="hint">
        {t('Used for the app interface and available recipe translations.')}
      </p>
      <form method="POST" onsubmit={saveLanguage}>
        <label>
          {t('Preferred language')}
          <select name="locale" value={data.locale}>
            {#each SUPPORTED_LOCALES as locale}
              <option value={locale}>{LOCALE_LABELS[locale]}</option>
            {/each}
          </select>
        </label>
        <button type="submit">{t('Save language')}</button>
      </form>
    </section>
    <section class="card">
      <h2>{t('Pantry staples')}</h2>
      <p class="hint">
        {t(
          'Ingredients you always have, such as salt or oil. One per line; they are omitted from shopping lists.',
        )}
      </p>
      <form method="POST" onsubmit={savePantry}>
        {#if pantryError}<p class="error">{pantryError}</p>{/if}
        {#if pantrySaved}<p class="success">
            {t('Pantry staples saved.')}
          </p>{/if}
        <label>
          {t('Always on hand')}
          <textarea name="pantryStaples" rows="5"
            >{data.pantryStaples.join('\n')}</textarea
          >
        </label>
        <button type="submit">{t('Save pantry staples')}</button>
      </form>
    </section>
    <section class="card">
      <h2>{t('Nutrition targets')}</h2>
      <p class="hint">
        {t(
          'Daily goals for nutrition bars and auto-compose. Blank uses the default.',
        )}
      </p>
      <form class="nutrition-form" method="POST" onsubmit={saveTargets}>
        {#if targetsSaved}<p class="success">{t('Targets saved.')}</p>{/if}
        <div class="target-grid">
          <label
            >{t('Calories')} (kcal)
            <input
              type="number"
              min="1"
              name="calorieTarget"
              value={data.calorieTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.calories)}
            /></label
          >
          <label
            >{t('Protein (g)')}
            <input
              type="number"
              min="1"
              name="proteinTarget"
              value={data.proteinTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.proteinG)}
            /></label
          >
          <label
            >{t('Carbs (g)')}
            <input
              type="number"
              min="1"
              name="carbsTarget"
              value={data.carbsTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.carbsG)}
            /></label
          >
          <label
            >{t('Fat (g)')}
            <input
              type="number"
              min="1"
              name="fatTarget"
              value={data.fatTarget ?? ''}
              placeholder={String(NUTRITION_TARGETS.fatG)}
            /></label
          >
        </div>
        <button type="submit">{t('Save targets')}</button>
      </form>
    </section>

    <section class="card security-card">
      <h2>{t('Change password')}</h2>
      <p class="hint">{t('Use at least eight characters.')}</p>
      <form method="POST" onsubmit={changePassword}>
        {#if passwordError}<p class="error">{passwordError}</p>{/if}
        {#if passwordSuccess}<p class="success">{passwordSuccess}</p>{/if}
        <label
          >{t('Current password')}
          <input type="password" name="current" required /></label
        >
        <label
          >{t('New password')}
          <input type="password" name="next" required minlength="8" /></label
        >
        <button type="submit">{t('Update password')}</button>
      </form>
    </section>

    <section class="card data-card">
      <h2>{t('Your data')}</h2>
      <p class="hint">
        {t(
          'Download a JSON copy of your profile settings, personal recipes, plans, favourites, and recipe submissions.',
        )}
      </p>
      <a class="download" href="/profile/export" download
        >{t('Download my data')}</a
      >
    </section>

    <section class="card danger-card">
      <h2>{t('Delete account')}</h2>
      <p class="hint">
        {t(
          'Permanently deletes your sessions, settings, recipes, plans, and other personal data. Shared recipes stay in the catalogue. This cannot be undone.',
        )}
      </p>
      <form method="POST" onsubmit={removeAccount}>
        {#if deletionError}<p class="error">{deletionError}</p>{/if}
        <label
          >{t('Password')}
          <input type="password" name="password" required /></label
        >
        <label
          >{t('Type {email} to confirm', { email: data.email })}
          <input
            type="email"
            name="confirmation"
            required
            autocomplete="off"
          /></label
        >
        <button class="danger" type="submit"
          >{t('Delete my account permanently')}</button
        >
      </form>
    </section>

    <section class="card household-card">
      <h2>Household sharing</h2>
      <p class="hint">
        Members see each other’s plans, recipes, and shopping lists. Choose
        whether each member can edit shared content.
      </p>
      {#if householdError}<p class="error">{householdError}</p>{/if}
      {#if data.household}
        <h3>{data.household.name}</h3>
        <ul class="members">
          {#each data.household.members as member}
            <li>
              <span>{member.email}</span>
              {#if member.userId === data.household.ownerId}
                <small>Owner · can edit</small>
              {:else if data.household.isOwner}
                <label class="permission">
                  <input
                    type="checkbox"
                    checked={member.canEdit}
                    onchange={(event) =>
                      changeMemberPermission(
                        member.userId,
                        event.currentTarget.checked,
                      )}
                  />
                  Can edit
                </label>
                <button
                  class="remove-member"
                  type="button"
                  onclick={() => deleteMember(member.userId)}>Remove</button
                >
              {:else}
                <small>{member.canEdit ? 'Can edit' : 'View only'}</small>
              {/if}
            </li>
          {/each}
        </ul>
        {#if data.household.isOwner}
          <form class="member-form" onsubmit={addMemberFromForm}>
            <label
              >Registered member email
              <input type="email" name="email" required />
            </label>
            <label class="permission">
              <input type="checkbox" name="canEdit" /> Can edit
            </label>
            <button type="submit">Send invitation</button>
          </form>
        {:else}
          <button
            type="button"
            class="remove-member"
            onclick={leaveCurrentHousehold}>Leave household</button
          >
        {/if}
      {:else}
        {#if data.householdInvitations.length}
          <h3>Household invitations</h3>
          <ul class="members">
            {#each data.householdInvitations as invitation}
              <li>
                <span>{invitation.householdName}</span>
                <small>{invitation.canEdit ? 'Can edit' : 'View only'}</small>
                <button
                  type="button"
                  onclick={() =>
                    respondToInvitation(invitation.householdId, true)}
                  >Accept</button
                >
                <button
                  class="remove-member"
                  type="button"
                  onclick={() =>
                    respondToInvitation(invitation.householdId, false)}
                  >Decline</button
                >
              </li>
            {/each}
          </ul>
        {/if}
        <form onsubmit={createHouseholdFromForm}>
          <label
            >Household name
            <input type="text" name="name" maxlength="80" required />
          </label>
          <button type="submit">Create household</button>
        </form>
      {/if}
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
  h3 {
    margin-bottom: 10px;
    font-family: Georgia, 'Times New Roman', serif;
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
  .household-card {
    grid-column: 1 / -1;
  }
  .members {
    display: grid;
    gap: 8px;
    margin: 0 0 18px;
    padding: 0;
    list-style: none;
  }
  .members li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid $color-border;
  }
  .members li > span {
    flex: 1;
  }
  .members small,
  .permission {
    color: $color-text-muted;
    font-size: 0.8rem;
  }
  label.permission {
    flex-direction: row;
    align-items: center;
  }
  .permission input {
    min-height: auto;
  }
  .member-form {
    grid-template-columns: minmax(220px, 1fr) auto auto;
    align-items: end;
  }
  .remove-member {
    min-height: 32px;
    padding: 5px 9px;
    border: 1px solid rgb(184 59 50 / 18%);
    background: #f9e4e1;
    color: $color-danger;
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
  select,
  textarea {
    min-height: 42px;
    padding: 9px 11px;
    background: $color-surface;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: 0.875rem;
  }
  textarea {
    resize: vertical;
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
