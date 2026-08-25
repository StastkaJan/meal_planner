<script lang="ts">
  import type { Meal } from '$lib/database/schema'
  import { DIFF_LABEL } from '$lib/constants'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Table from '$lib/components/ui/Table.svelte'
  import { useI18n } from '$lib/i18n-context'

  const { t, label } = useI18n()

  let {
    meals,
    emptyMessage,
    creating = $bindable(false),
    onCreate,
    onDelete,
    onFavorite,
    isAdmin,
  }: {
    meals: (Meal & { isFavorite: boolean })[]
    emptyMessage: string
    creating?: boolean
    onCreate: (
      name: FormDataEntryValue | null,
      scope: FormDataEntryValue | null,
    ) => void
    onDelete: (id: number) => void
    onFavorite: (id: number, favorite: boolean) => void
    isAdmin: boolean
  } = $props()

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    onCreate(data.get('name'), data.get('scope'))
  }
</script>

{#snippet mealRow(meal: Meal & { isFavorite: boolean })}
  <tr>
    <td class="meal-name">
      <a href="/meals/{meal.id}">{meal.name}</a>
      {#if meal.userId}<span class="own-tag">{t('Personal')}</span>{/if}
    </td>
    <td>
      {meal.difficulty ? label(meal.difficulty) : '—'}
    </td>
    <td>{meal.timeMinutes ? `${meal.timeMinutes} min` : '—'}</td>
    <td class="actions">
      <Button
        size="sm"
        variant="secondary"
        class={meal.isFavorite ? 'active' : ''}
        aria-label={meal.isFavorite ? t('Unfavourite') : t('Mark as favourite')}
        onclick={() => onFavorite(meal.id, !meal.isFavorite)}
      >
        {meal.isFavorite ? '★' : '☆'}
      </Button>
      {#if meal.userId}
        <Button size="sm" variant="danger" onclick={() => onDelete(meal.id)}
          >{t('Delete')}</Button
        >
      {/if}
    </td>
  </tr>
{/snippet}

<div class="table-wrap">
  {#if creating}
    <form class="create-form" method="POST" onsubmit={submit}>
      <Input type="text" name="name" placeholder={t('Meal name')} required />
      {#if isAdmin}
        <Select
          name="scope"
          title={t('Who can see this recipe')}
          options={[
            { value: 'personal', label: t('Just me') },
            { value: 'global', label: t('Everyone') },
          ]}
        />
      {:else}
        <input type="hidden" name="scope" value="personal" />
      {/if}
      <Button size="sm" type="submit">{t('Save')}</Button>
      <Button size="sm" variant="secondary" onclick={() => (creating = false)}
        >{t('Cancel')}</Button
      >
    </form>
  {/if}
  <Table
    data={meals}
    columns={[t('Name'), t('Difficulty'), t('Preparation'), t('Actions')]}
    row={mealRow}
    {emptyMessage}
  />
</div>

<style lang="scss">
  .table-wrap {
    overflow: hidden;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 16px 40px rgb(41 39 33 / 6%);
  }

  .create-form {
    display: grid;
    grid-template-columns: 1fr 10rem auto auto;
    gap: 0.6rem;
    padding: 0.8rem;
    border-bottom: 1px solid $color-border;
  }

  .meal-name {
    font-weight: 500;

    a {
      color: $color-text;
      font-weight: 650;
      text-decoration: none;

      &:hover {
        color: $color-accent;
      }
    }
  }

  .own-tag {
    margin-left: 8px;
    padding: 1px 7px;
    border: 0;
    border-radius: 999px;
    background: $color-accent-dim;
    color: #994427;
    font-size: 0.65rem;
    text-transform: uppercase;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.25rem;
  }

  .actions :global(.active) {
    border-color: $color-accent;
    color: $color-accent;
  }

  @media (max-width: 640px) {
    .create-form {
      grid-template-columns: 1fr 1fr;
    }
    .create-form :global(.ui-input) {
      grid-column: 1 / -1;
    }
  }
</style>
