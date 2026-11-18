<!-- The select with its list, its options and its items drawn by the app, for tests -->
<script>
  import Item from './test-item.svelte'
  import List from './test-list.svelte'
  import Option from './test-option.svelte'
  import { Select } from './index.js'

  /** @type {any} */
  export let sources
</script>

<Select disabled={false} label="Fruit" placeholder="Choose a fruit" rows={4} source="fruit" {sources} item={Item} parts={{ list: List, option: Option }} on:change />
