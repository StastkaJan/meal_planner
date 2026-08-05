<script lang="ts">
  let { data } = $props()
  let shareStatus = $state('')

  const shoppingText = $derived(
    [
      `Shopping list — week of ${data.week}`,
      '',
      ...data.items.map((item) => {
        const amount =
          item.qty !== null
            ? `${item.qty}${item.unit ? ` ${item.unit}` : ''} `
            : item.count > 1
              ? `${item.count}× `
              : ''
        return `☐ ${amount}${item.name}`
      }),
    ].join('\n'),
  )

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
  {#if shareStatus}<p class="share-status" aria-live="polite">
      {shareStatus}
    </p>{/if}

  {#if data.items.length === 0}
    <p class="empty">No meals assigned this week — nothing to shop for yet.</p>
  {:else}
    <ul>
      {#each data.items as item (item.name)}
        <li>
          <label>
            <input type="checkbox" />
            {#if item.qty !== null}
              <span
                >{item.qty}{item.unit ? ` ${item.unit}` : ''}
                {item.name}</span
              >
            {:else}
              <span>{item.name}</span>
              {#if item.count > 1}<span class="count">×{item.count}</span>{/if}
            {/if}
          </label>
        </li>
      {/each}
    </ul>
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
    margin: 4px 0 24px;
  }
  .empty {
    color: $color-text-muted;
    font-size: 0.9rem;
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
  label {
    display: flex;
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
  .count {
    color: $color-text-muted;
    font-size: 0.8rem;
    margin-left: auto;
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
  }
</style>
