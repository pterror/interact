<!--
  A widget described for a component, drawn by Svelte 4: its bound value the bindable `bound` (a generated component
  binds its own name for it to this), each change and event dispatched (`on:change`, given the value and how to refuse
  it), an item drawn by the component `item` (given its `key`), and a part the app replaces by its component in `parts`
-->
<script context="module">
  let counted = 0
</script>

<script>
  import { inForm } from '@pterror/interact-core'
  import { afterUpdate, createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { start } from '../run.js'
  import Part from './part.svelte'

  /** @type {import('@pterror/interact-core').Description} */
  export let description
  /** @type {unknown} */
  export let bound = undefined
  /** @type {any} */
  export let item = undefined
  /** @type {Record<string, any>} */
  export let parts = {}

  const dispatch = createEventDispatcher()
  /** @type {Element | null} */
  let live = null
  let version = 0
  const running = start(description, $$restProps, bound, `s${String((counted += 1))}`, () => live, {
    bind: (value) => {
      bound = value
    },
    call: (event, inside, args) => {
      if (inside.length === 0) {
        dispatch(event, event === 'change' ? { change: args[1], value: args[0] } : args[0])
        return
      }
      let at = $$restProps
      for (const name of inside) {
        at = at[name] ?? {}
      }
      const heard = at[`on${event}`]
      if (typeof heard === 'function') {
        heard(...args)
      }
    },
  })
  const unwatch = running.page.host.watch(() => {
    version += 1
  })
  // Before the tree, which a change of props redraws in the same pass
  $: running.update($$restProps, bound)
  $: tree = (version, running.tree())
  $: field = (version, bound, running.form() ?? '')
  /** @type {HTMLInputElement | null} */
  let input = null
  /** @type {HTMLFormElement | null} */
  let form = null

  onMount(() => {
    running.drawn(live)
    running.page.host.begin()
    form = input?.form ?? null
    form?.addEventListener('reset', running.reset)
  })
  afterUpdate(() => {
    running.drawn(live)
  })
  onDestroy(() => {
    form?.removeEventListener('reset', running.reset)
    unwatch()
    running.stop()
  })
</script>

<Part {item} naming={running.page.naming} node={tree} {parts} sources={running.sources} /><div
  bind:this={live}
  role="status"
></div>{#if typeof $$restProps['name'] === 'string' && inForm(description)}<input
    bind:this={input}
    name={$$restProps['name']}
    type="hidden"
    value={field}
  />{/if}
