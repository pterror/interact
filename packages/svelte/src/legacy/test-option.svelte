<!-- An option drawn by the app, for tests -->
<script>
  /** @type {Record<string, unknown>} */
  export let attrs
  /** @type {{ item: string }} */
  export let part
</script>

<li {...attrs} data-key={part.item}><slot /></li>
