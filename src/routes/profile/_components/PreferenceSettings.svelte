<script lang="ts">
  import ChoiceChips from '$lib/components/ui/ChoiceChips.svelte'
  import { CUISINE_OPTIONS, DIET_OPTIONS } from '$lib/constants'

  let {
    cuisinePrefs = $bindable([]),
    dietaryRestrictions = $bindable([]),
    onChange,
  }: {
    cuisinePrefs?: string[]
    dietaryRestrictions?: string[]
    onChange: (patch: object) => void
  } = $props()
</script>

<div class="preferences">
  <section>
    <h3>Cuisine preferences</h3>
    <ChoiceChips
      options={CUISINE_OPTIONS}
      bind:selected={cuisinePrefs}
      onChange={(value) => onChange({ cuisinePrefs: value })}
    />
  </section>
  <section>
    <h3>Dietary restrictions</h3>
    <ChoiceChips
      options={DIET_OPTIONS}
      bind:selected={dietaryRestrictions}
      format={(value) => value.replace('_', ' ')}
      onChange={(value) => onChange({ dietaryRestrictions: value })}
    />
  </section>
</div>

<style lang="scss">
  .preferences {
    display: grid;
    gap: 1rem;
  }

  h3 {
    margin-bottom: 0.5rem;
    color: $color-text-muted;
    font-size: 0.8rem;
    text-transform: uppercase;
  }
</style>
