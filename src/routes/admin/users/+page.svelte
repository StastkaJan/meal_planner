<script lang="ts">
  import type { PageData } from './$types'
  import { setUserAdmin } from '$lib/api/admin'
  import Button from '$lib/components/ui/Button.svelte'
  import Table from '$lib/components/ui/Table.svelte'
  import { useI18n } from '$lib/i18n-context'

  let { data }: { data: PageData } = $props()
  const { t, message: translateMessage } = useI18n()
  let users = $derived(data.users)
  let busyId = $state<number | null>(null)
  let error = $state('')

  async function changeRole(id: number, isAdmin: boolean) {
    if (busyId !== null) return
    error = ''
    busyId = id
    try {
      const updated = await setUserAdmin(id, isAdmin)
      users = users.map((user) => (user.id === id ? updated : user))
    } catch (cause) {
      error =
        cause instanceof Error
          ? translateMessage(cause.message)
          : t('Request failed')
    } finally {
      busyId = null
    }
  }
</script>

{#snippet userRow(user: (typeof users)[number])}
  <tr>
    <td>{user.email}</td>
    <td>{user.isAdmin ? t('Administrator') : t('User')}</td>
    <td class="actions">
      {#if user.id === data.currentUserId}
        <span>{t('Current account')}</span>
      {:else}
        <Button
          size="sm"
          variant={user.isAdmin ? 'danger' : 'secondary'}
          disabled={busyId !== null}
          onclick={() => changeRole(user.id, !user.isAdmin)}
        >
          {user.isAdmin ? t('Revoke admin') : t('Make admin')}
        </Button>
      {/if}
    </td>
  </tr>
{/snippet}

<div class="page">
  <div>
    <p class="eyebrow">{t('Administration')}</p>
    <h1>{t('User management')}</h1>
    <p class="subtitle">
      {t('Control who can manage shared recipes and users.')}
    </p>
  </div>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <div class="table-wrap">
    <Table
      data={users}
      columns={[t('Email'), t('Role'), t('Actions')]}
      row={userRow}
      emptyMessage={t('No users found.')}
    />
  </div>
</div>

<style lang="scss">
  .page {
    display: grid;
    gap: 1.25rem;
  }
  .eyebrow {
    color: $color-accent;
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: uppercase;
  }
  h1 {
    font-family: Georgia, serif;
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 500;
  }
  .subtitle,
  .actions span {
    color: $color-text-muted;
  }
  .table-wrap {
    overflow: hidden;
    border: 1px solid $color-border;
    border-radius: $radius;
  }
  .actions {
    width: 1%;
    white-space: nowrap;
  }
  .error {
    color: $color-danger;
  }
</style>
