<script lang="ts">
  import { CUISINE_OPTIONS, DIET_OPTIONS } from '$lib/constants'
  import type { Plan } from '$lib/schema'

  let {
    plan,
    onChange,
  }: {
    plan: Pick<Plan, 'cuisinePrefs' | 'dietaryRestrictions'>
    onChange: (
      patch: Partial<Pick<Plan, 'cuisinePrefs' | 'dietaryRestrictions'>>,
    ) => void
  } = $props()

  let cuisinePrefs = $derived(plan.cuisinePrefs ?? [])
  let dietaryRestrictions = $derived(plan.dietaryRestrictions ?? [])

  let debounce: ReturnType<typeof setTimeout>

  function toggle(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
  }

  function onCuisineChange(val: string) {
    cuisinePrefs = toggle(cuisinePrefs, val)
    clearTimeout(debounce)
    debounce = setTimeout(() => onChange({ cuisinePrefs }), 400)
  }

  function onDietChange(val: string) {
    dietaryRestrictions = toggle(dietaryRestrictions, val)
    clearTimeout(debounce)
    debounce = setTimeout(() => onChange({ dietaryRestrictions }), 400)
  }
</script>

<details class="settings">
  <summary>Plan settings</summary>
  <div class="body">
    <section>
      <h4>Cuisine preferences</h4>
      <div class="chips">
        {#each CUISINE_OPTIONS as opt}
          <label class="chip" class:active={cuisinePrefs.includes(opt)}>
            <input
              type="checkbox"
              checked={cuisinePrefs.includes(opt)}
              onchange={() => onCuisineChange(opt)}
            />
            {opt}
          </label>
        {/each}
      </div>
    </section>

    <section>
      <h4>Dietary restrictions</h4>
      <div class="chips">
        {#each DIET_OPTIONS as opt}
          <label class="chip" class:active={dietaryRestrictions.includes(opt)}>
            <input
              type="checkbox"
              checked={dietaryRestrictions.includes(opt)}
              onchange={() => onDietChange(opt)}
            />
            {opt.replace('_', ' ')}
          </label>
        {/each}
      </div>
    </section>
  </div>
</details>

<style lang="scss">
  .settings {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius;
    margin-bottom: 16px;
  }
  summary {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: $color-text-muted;
    user-select: none;
    &:hover {
      color: $color-text;
    }
  }
  .body {
    padding: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h4 {
    font-size: 0.75rem;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 6px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: $color-surface-2;
    border: 1px solid $color-border;
    border-radius: 999px;
    font-size: 0.78rem;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;

    &.active {
      background: $color-accent-dim;
      border-color: $color-accent;
      color: $color-text;
    }

    input {
      display: none;
    }
  }
</style>
