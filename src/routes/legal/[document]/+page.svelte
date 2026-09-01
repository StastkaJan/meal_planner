<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.title} · Papu Plan</title>
</svelte:head>

<!-- The server renders trusted, bundled Markdown; this HTML never comes from users. -->
<article class="legal-document">
  {@html data.html}
</article>

<style lang="scss">
  .legal-document {
    max-width: 880px;
    margin: 0 auto;
    padding: clamp(1.25rem, 4vw, 3rem);
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    box-shadow: 0 12px 36px rgb(41 39 33 / 6%);
    color: $color-text;
    line-height: 1.65;
  }

  .legal-document :global(h1),
  .legal-document :global(h2),
  .legal-document :global(h3) {
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 500;
    line-height: 1.2;
  }
  .legal-document :global(h1) {
    margin-bottom: 1.5rem;
    font-size: clamp(2rem, 5vw, 3rem);
  }
  .legal-document :global(h2) {
    margin: 2rem 0 0.75rem;
    font-size: 1.45rem;
  }
  .legal-document :global(h3) {
    margin: 1.5rem 0 0.6rem;
    font-size: 1.1rem;
  }
  .legal-document :global(p),
  .legal-document :global(ul),
  .legal-document :global(ol) {
    margin: 0.75rem 0;
  }
  .legal-document :global(ul),
  .legal-document :global(ol) {
    padding-left: 1.5rem;
  }
  .legal-document :global(a) {
    color: $color-accent;
  }
  .legal-document :global(blockquote) {
    margin: 1rem 0;
    padding: 0.8rem 1rem;
    border-left: 4px solid $color-accent;
    background: $color-surface-2;
  }
  .legal-document :global(table) {
    display: block;
    width: 100%;
    margin: 1rem 0;
    overflow-x: auto;
    border-collapse: collapse;
  }
  .legal-document :global(th),
  .legal-document :global(td) {
    padding: 0.6rem;
    border: 1px solid $color-border;
    text-align: left;
    vertical-align: top;
  }
</style>
