<script lang="ts">
  let { data } = $props()
</script>

<div class="shopping">
  <a class="back" href="/?plan={data.planId}&week={data.week}">← Meal plan</a>
  <p class="eyebrow">Everything for the week</p>
  <h1>Shopping list</h1>
  <p class="week">Week of {data.week}</p>

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
