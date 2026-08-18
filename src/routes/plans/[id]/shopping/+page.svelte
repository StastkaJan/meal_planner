<script lang="ts">
  import {
    addShoppingItem,
    deleteShoppingItem,
    saveShoppingItem,
    setPlanPortions,
  } from '$lib/api/plans'
  import { AISLES, type ShoppingListItem } from '$lib/domain/shopping'

  let { data } = $props()
  let items = $derived(data.items as ShoppingListItem[])
  let shareStatus = $state('')
  let customName = $state('')
  let customAisle = $state<(typeof AISLES)[number]>('Other')

  async function handlePortionsChange(portions: number) {
    await setPlanPortions(data.planId, portions)
    location.reload()
  }

  const groups = $derived.by(() =>
    AISLES.map((aisle) => ({
      aisle,
      items: items.filter((item) => !item.excluded && item.aisle === aisle),
    })).filter((group) => group.items.length),
  )
  const excludedItems = $derived(items.filter((item) => item.excluded))

  const shoppingText = $derived(
    [
      `Shopping list — week of ${data.week}`,
      '',
      ...groups.flatMap((group) => [
        group.aisle,
        ...group.items.map((item) => `☐ ${itemAmount(item)}${item.name}`),
        '',
      ]),
    ].join('\n'),
  )

  function itemAmount(item: ShoppingListItem) {
    if (item.qty !== null)
      return `${item.qty}${item.unit ? ` ${item.unit}` : ''} `
    return item.count > 1 ? `${item.count}× ` : ''
  }

  async function updateItem(
    item: ShoppingListItem,
    changes: Partial<ShoppingListItem>,
  ) {
    const updated = { ...item, ...changes }
    await saveShoppingItem(data.planId, data.week, updated)
    items = items.map((candidate) =>
      candidate.key === item.key ? updated : candidate,
    )
  }

  async function addCustomItem(event: SubmitEvent) {
    event.preventDefault()
    if (!customName.trim()) return
    const item = await addShoppingItem(
      data.planId,
      data.week,
      customName,
      customAisle,
    )
    items = [...items, item]
    customName = ''
  }

  async function removeCustomItem(item: ShoppingListItem) {
    await deleteShoppingItem(data.planId, data.week, item.key)
    items = items.filter((candidate) => candidate.key !== item.key)
  }

  async function shareList() {
    shareStatus = ''
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Shopping list', text: shoppingText })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copyList()
  }

  async function copyList() {
    if (!navigator.clipboard) {
      shareStatus = 'Sharing and copying are not supported by this browser.'
      return
    }
    try {
      await navigator.clipboard.writeText(shoppingText)
      shareStatus = 'Copied. Paste it into Google Keep or another app.'
    } catch {
      shareStatus = 'Could not share or copy this list.'
    }
  }
</script>

<div class="shopping">
  <div class="toolbar">
    <a class="back" href="/?plan={data.planId}&week={data.week}">← Meal plan</a>
    <div class="actions">
      <button class="share" type="button" onclick={copyList}>Copy list</button>
      <button
        class="share"
        type="button"
        title="Choose Google Keep or another app from the share menu"
        onclick={shareList}>Share list</button
      >
    </div>
  </div>
  <p class="eyebrow">Everything for the week</p>
  <h1>Shopping list</h1>
  <p class="week">Week of {data.week}</p>
  <label class="portions">
    People served
    <input
      type="number"
      min="1"
      max="100"
      value={data.portions}
      onchange={(event) =>
        handlePortionsChange(Number(event.currentTarget.value))}
    />
  </label>
  <form class="custom-item" onsubmit={addCustomItem}>
    <label>
      Custom item
      <input
        bind:value={customName}
        maxlength="100"
        placeholder="e.g. Bin bags"
      />
    </label>
    <label>
      Aisle
      <select bind:value={customAisle}>
        {#each AISLES as aisle}<option>{aisle}</option>{/each}
      </select>
    </label>
    <button type="submit">Add</button>
  </form>
  {#if shareStatus}<p class="share-status" aria-live="polite">
      {shareStatus}
    </p>{/if}

  {#if groups.length === 0}
    <p class="empty">Nothing left on this week's list.</p>
  {:else}
    {#each groups as group (group.aisle)}
      <section class="aisle">
        <h2>{group.aisle}</h2>
        <ul>
          {#each group.items as item (item.key)}
            <li>
              <div class="item-row">
                <label class="check-item">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onchange={(event) =>
                      updateItem(item, {
                        checked: event.currentTarget.checked,
                      })}
                  />
                  <span>{itemAmount(item)}{item.name}</span>
                </label>
                <select
                  aria-label="Aisle for {item.name}"
                  value={item.aisle}
                  onchange={(event) =>
                    updateItem(item, { aisle: event.currentTarget.value })}
                >
                  {#each AISLES as aisle}<option>{aisle}</option>{/each}
                </select>
                {#if item.custom}
                  <button type="button" onclick={() => removeCustomItem(item)}
                    >Remove</button
                  >
                {:else}
                  <button
                    type="button"
                    onclick={() => updateItem(item, { excluded: true })}
                    >Exclude</button
                  >
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}

  {#if excludedItems.length}
    <details class="excluded">
      <summary>Excluded items ({excludedItems.length})</summary>
      <ul>
        {#each excludedItems as item (item.key)}
          <li>
            <span>{item.name}</span>
            <button
              type="button"
              onclick={() => updateItem(item, { excluded: false })}
              >Restore</button
            >
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style lang="scss">
  .shopping {
    max-width: 640px;
    margin: 0 auto;
    padding: 34px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    box-shadow: 0 18px 48px rgb(41 39 33 / 7%);
  }
  .back {
    color: $color-text-muted;
    font-size: 0.8rem;
    text-decoration: none;
    &:hover {
      color: $color-text;
    }
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .actions {
    display: flex;
    gap: 6px;
  }
  .share {
    padding: 6px 10px;
    border: 1px solid $color-border-strong;
    border-radius: $radius-sm;
    color: $color-text-muted;
    background: transparent;
    cursor: pointer;
    font-size: 0.8rem;
    text-decoration: none;
    &:hover {
      border-color: $color-accent;
      color: $color-text;
    }
  }
  .share-status {
    margin: -14px 0 18px;
    color: $color-text-muted;
    font-size: 0.8rem;
  }
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 2.3rem;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .eyebrow {
    margin-top: 24px;
    color: $color-accent;
    font-size: 0.7rem;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .week {
    color: $color-text-muted;
    font-size: 0.85rem;
    margin: 4px 0 18px;
  }
  .portions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
    color: $color-text-muted;
    font-size: 0.85rem;
    cursor: pointer;
    input {
      width: 76px;
      min-height: 38px;
      padding: 7px 9px;
      border: 1px solid $color-border-strong;
      border-radius: $radius-sm;
      background: $color-surface;
    }
  }
  .empty {
    color: $color-text-muted;
    font-size: 0.9rem;
  }
  .custom-item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: end;
    gap: 8px;
    margin-bottom: 24px;
    label {
      display: grid;
      gap: 4px;
      color: $color-text-muted;
      font-size: 0.75rem;
    }
    input,
    select,
    button {
      min-height: 38px;
      padding: 7px 9px;
      border: 1px solid $color-border-strong;
      border-radius: $radius-sm;
      background: $color-surface;
    }
  }
  .aisle {
    margin-top: 24px;
    h2 {
      margin-bottom: 8px;
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    border-top: 1px solid $color-border;
    &:last-child {
      border-bottom: 1px solid $color-border;
    }
  }
  .check-item {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 12px 4px;
    font-size: 0.9rem;
    cursor: pointer;
    &:has(input:checked) span {
      color: $color-text-muted;
      text-decoration: line-through;
    }
  }
  .item-row {
    display: flex;
    align-items: center;
    gap: 8px;
    select,
    button {
      padding: 5px 7px;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      color: $color-text-muted;
      background: transparent;
      font-size: 0.75rem;
    }
  }
  .excluded {
    margin-top: 24px;
    color: $color-text-muted;
    summary {
      cursor: pointer;
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px;
    }
  }
  input[type='checkbox'] {
    width: 19px;
    height: 19px;
    accent-color: $color-accent;
  }
  @media (max-width: 540px) {
    .shopping {
      padding: 24px 20px;
    }
    .custom-item {
      grid-template-columns: 1fr auto;
      label:first-child {
        grid-column: 1 / -1;
      }
    }
    .item-row {
      flex-wrap: wrap;
    }
  }
</style>
