<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let creating = $state(false)

  let importing = $state(false)
  let importUrl = $state('')
  let importError = $state('')
  let importBusy = $state(false)

  const diffLabel: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  }

  // Import parses schema.org data, then creates a personal draft you review/edit on its page.
  async function importRecipe() {
    if (!importUrl.trim() || importBusy) return
    importError = ''
    importBusy = true
    try {
      const res = await fetch('/meals/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      if (!res.ok) {
        importError =
          (await res.json().catch(() => ({}))).message ?? 'Import failed'
        return
      }
      const fields = await res.json()
      const createRes = await fetch('/meals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, scope: 'personal' }),
      })
      if (!createRes.ok) {
        importError =
          'Imported the recipe but couldn’t save it (missing a name?)'
        return
      }
      const created = await createRes.json()
      await goto(`/meals/${created.id}`)
    } catch {
      importError = 'Something went wrong'
    } finally {
      importBusy = false
    }
  }
</script>

<div class="page">
  <div class="top-bar">
    <h2>Meals</h2>
    <div class="top-actions">
      <button
        class="btn ghost"
        onclick={() => {
          importing = !importing
          importError = ''
        }}>Import from URL</button
      >
      <button
        class="btn"
        onclick={() => {
          creating = true
        }}>+ Add meal</button
      >
    </div>
  </div>

  {#if importing}
    <div class="import-bar">
      <input
        type="url"
        placeholder="https://…recipe page URL"
        bind:value={importUrl}
        onkeydown={(e) => {
          if (e.key === 'Enter') importRecipe()
        }}
      />
      <button class="btn sm" onclick={importRecipe} disabled={importBusy}
        >{importBusy ? 'Importing…' : 'Import'}</button
      >
      <button
        class="btn sm ghost"
        onclick={() => {
          importing = false
          importError = ''
        }}>Cancel</button
      >
      {#if importError}<span class="import-error">{importError}</span>{/if}
    </div>
  {/if}

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Difficulty</th>
          <th>Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#if creating}
          <tr class="edit-row">
            <td colspan="4">
              <form
                method="POST"
                action="?/create"
                use:enhance={() =>
                  async ({ update }) => {
                    creating = false
                    await update()
                  }}
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Meal name"
                  autofocus
                />
                <select name="scope" title="Who can see this recipe">
                  <option value="global">Everyone</option>
                  <option value="personal">Just me</option>
                </select>
                <button class="btn sm" type="submit">Save</button>
                <button
                  class="btn sm ghost"
                  type="button"
                  onclick={() => {
                    creating = false
                  }}>Cancel</button
                >
              </form>
            </td>
          </tr>
        {/if}

        {#each data.meals as meal (meal.id)}
          <tr>
            <td class="meal-name">
              <a href="/meals/{meal.id}">{meal.name}</a>
              {#if meal.userId}<span class="own-tag">Personal</span>{/if}
            </td>
            <td
              >{meal.difficulty
                ? (diffLabel[meal.difficulty] ?? meal.difficulty)
                : '—'}</td
            >
            <td>{meal.timeMinutes ? `${meal.timeMinutes} min` : '—'}</td>
            <td class="actions">
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm('Delete this meal?')) e.preventDefault()
                }}
              >
                <input type="hidden" name="id" value={meal.id} />
                <button class="btn sm danger" type="submit">Delete</button>
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="empty">No meals yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .top-actions {
    display: flex;
    gap: 6px;
  }
  h2 {
    font-size: 1.2rem;
    font-weight: 600;
  }

  .import-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;

    input {
      flex: 1;
      background: $color-surface-2;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      padding: 6px 10px;
      color: $color-text;
      font-size: 0.875rem;
      &:focus {
        outline: 2px solid $color-accent;
        border-color: transparent;
      }
    }
    .import-error {
      color: $color-danger;
      font-size: 0.8rem;
    }
  }

  .table-wrap {
    border: 1px solid $color-border;
    border-radius: $radius;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  thead {
    background: $color-surface;
  }
  th {
    text-align: left;
    padding: 10px 12px;
    color: $color-text-muted;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 2px solid $color-border;
  }
  td {
    padding: 10px 12px;
    border-top: 1px solid $color-border;
    color: $color-text;
  }
  tr:first-child td {
    border-top: none;
  }
  tbody tr:hover td {
    background: $color-surface-2;
  }

  .meal-name {
    font-weight: 500;
    a {
      color: $color-text;
      text-decoration: none;
      &:hover {
        color: $color-accent;
      }
    }
    .own-tag {
      margin-left: 8px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: $color-accent;
      border: 1px solid $color-accent-dim;
      border-radius: 999px;
      padding: 1px 7px;
    }
  }

  .edit-row td {
    padding: 4px 6px;
    background: $color-surface;
  }
  .edit-row form {
    display: flex;
    gap: 4px;
  }
  .edit-row input {
    flex: 1;
  }
  .edit-row input,
  .edit-row select {
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: 5px 8px;
    color: $color-text;
    &:focus {
      outline: 2px solid $color-accent;
      border-color: transparent;
    }
  }

  .actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }

  .btn {
    padding: 5px 14px;
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: opacity 0.15s;
    &:hover {
      opacity: 0.85;
    }
    &.sm {
      padding: 3px 10px;
      font-size: 0.8rem;
    }
    &.ghost {
      background: $color-surface;
      color: $color-text-muted;
      border: 1px solid $color-border;
    }
    &.danger {
      background: $color-danger;
    }
  }

  .empty {
    text-align: center;
    color: $color-text-muted;
    padding: 32px;
  }
</style>
