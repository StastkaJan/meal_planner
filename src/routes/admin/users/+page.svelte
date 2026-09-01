<script lang="ts">
  import type { PageData } from './$types'
  import { setUserAdmin, setUserPro } from '$lib/api/admin'
  import Button from '$lib/components/ui/Button.svelte'
  import Table from '$lib/components/ui/Table.svelte'
  import { useI18n } from '$lib/i18n-context'

  let { data }: { data: PageData } = $props()
  const { t, message: translateMessage } = useI18n()
  let users = $derived(data.users)
  let busyId = $state<number | null>(null)
  let error = $state('')
  const proCount = $derived(users.filter((user) => user.isPro).length)

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

  async function changePlan(id: number, isPro: boolean) {
    if (busyId !== null) return
    error = ''
    busyId = id
    try {
      const updated = await setUserPro(id, isPro)
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
    <td>{user.isPro ? t('Pro plan') : t('Free plan')}</td>
    <td class="actions">
      <div class="action-buttons">
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
        <Button
          size="sm"
          variant={user.isPro ? 'danger' : 'secondary'}
          disabled={busyId !== null}
          onclick={() => changePlan(user.id, !user.isPro)}
        >
          {user.isPro ? t('Revoke Pro') : t('Grant Pro')}
        </Button>
      </div>
    </td>
  </tr>
{/snippet}

<div class="page">
  <div>
    <p class="eyebrow">{t('Administration')}</p>
    <h1>{t('User management')}</h1>
    <p class="subtitle">
      {t('Control administrator roles and Pro plan access.')}
    </p>
  </div>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <section class="plan-summary" aria-labelledby="plan-access-heading">
    <div>
      <h2 id="plan-access-heading">{t('Plan access')}</h2>
      <p>
        {t('{pro} Pro and {free} Free accounts', {
          pro: proCount,
          free: users.length - proCount,
        })}
      </p>
    </div>
    <a href="/pricing">{t('View plan comparison')}</a>
  </section>

  <div class="table-wrap">
    <Table
      data={users}
      columns={[t('Email'), t('Role'), t('Plan'), t('Actions')]}
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
  .plan-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;

    h2 {
      font-family: Georgia, serif;
      font-size: 1.2rem;
      font-weight: 500;
    }
    p {
      color: $color-text-muted;
      font-size: 0.875rem;
    }
    a {
      color: $color-accent;
      font-weight: 650;
    }
  }
  .actions {
    width: 1%;
    white-space: nowrap;
  }
  .action-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .error {
    color: $color-danger;
  }
  @media (max-width: 640px) {
    .plan-summary {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
