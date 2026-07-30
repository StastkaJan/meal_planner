<script lang="ts">
  import type { Meal } from '$lib/database/schema'
  import { DIFF_LABEL } from '$lib/constants'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Table from '$lib/components/ui/Table.svelte'

  let {
    meals,
    emptyMessage,
    creating = $bindable(false),
    onCreate,
    onDelete,
    onFavorite,
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
      {#if meal.userId}<span class="own-tag">Personal</span>{/if}
    </td>
    <td>
      {meal.difficulty ? (DIFF_LABEL[meal.difficulty] ?? meal.difficulty) : '—'}
    </td>
    <td>{meal.timeMinutes ? `${meal.timeMinutes} min` : '—'}</td>
    <td class="actions">
      <Button
        size="sm"
        variant="secondary"
        class={meal.isFavorite ? 'active' : ''}
        aria-label={meal.isFavorite ? 'Unfavourite' : 'Mark as favourite'}
        onclick={() => onFavorite(meal.id, !meal.isFavorite)}
      >
        {meal.isFavorite ? '★' : '☆'}
      </Button>
      {#if meal.userId}
        <Button size="sm" variant="danger" onclick={() => onDelete(meal.id)}
          >Delete</Button
        >
      {/if}
    </td>
  </tr>
{/snippet}

<div class="table-wrap">
  {#if creating}
    <form class="create-form" method="POST" onsubmit={submit}>
      <Input type="text" name="name" placeholder="Meal name" required />
      <Select
        name="scope"
        title="Who can see this recipe"
        options={[
          { value: 'personal', label: 'Just me' },
          { value: 'global', label: 'Everyone (read-only)' },
        ]}
      />
      <Button size="sm" type="submit">Save</Button>
      <Button size="sm" variant="secondary" onclick={() => (creating = false)}
        >Cancel</Button
      >
    </form>
  {/if}
  <Table
    data={meals}
    columns={['Name', 'Difficulty', 'Time', 'Actions']}
    row={mealRow}
    {emptyMessage}
  />
</div>

<style lang="scss">
  .table-wrap {
    overflow: hidden;
    border: 1px solid $color-border;
    border-radius: $radius;
  }

  .create-form {
    display: grid;
    grid-template-columns: 1fr 10rem auto auto;
    gap: 0.4rem;
    padding: 0.4rem;
    border-bottom: 1px solid $color-border;
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
  }

  .own-tag {
    margin-left: 8px;
    padding: 1px 7px;
    border: 1px solid $color-accent-dim;
    border-radius: 999px;
    color: $color-accent;
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
</style>
