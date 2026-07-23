<script lang="ts">
  let { data } = $props()
</script>

<div class="shopping">
  <a class="back" href="/?plan={data.planId}&week={data.week}"
    >← {data.planName}</a
  >
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
              <span>{item.qty} {item.name}</span>
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
    max-width: 480px;
    padding: 32px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
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
    margin: 8px 0 2px;
    font-size: 1.25rem;
  }
  .week {
    color: $color-text-muted;
    font-size: 0.85rem;
    margin: 0 0 20px;
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
    padding: 10px 4px;
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
</style>
