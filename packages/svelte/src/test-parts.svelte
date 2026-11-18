<!-- The select with its list, its options and its items drawn by the app, for tests -->
<script>
  import { Select } from './index.js'

  /** @type {Record<string, any>} */
  let { onchange, sources } = $props()
</script>

{#snippet list(/** @type {Record<string, unknown>} */ attrs, /** @type {unknown} */ _part, /** @type {import('svelte').Snippet} */ children)}
  <ul {...attrs}>{@render children()}</ul>
{/snippet}
{#snippet option(/** @type {Record<string, unknown>} */ attrs, /** @type {{ item: string }} */ part, /** @type {import('svelte').Snippet} */ children)}
  <li {...attrs} data-key={part.item}>{@render children()}</li>
{/snippet}

<Select disabled={false} label="Fruit" placeholder="Choose a fruit" rows={4} source="fruit" {sources} {onchange} parts={{ list, option }}>
  {#snippet children(/** @type {string} */ key)}<b>{key}</b>{/snippet}
</Select>
