<!--
  A widget described for a component, drawn by Svelte 5: its bound value the bindable `bound` (a generated component
  binds its own name for it to this), an item drawn by the `children` snippet, a part the app replaces by its snippet
  in `parts`, and ids from `$props.id()`
-->
<script>
  import { onMount } from 'svelte'

  import Part from './part.svelte'
  import { callbackProp, callIn, start } from './run.js'

  /** @type {Record<string, any>} */
  let { bound = $bindable(), children, description, parts = {}, ...rest } = $props()

  const id = $props.id()
  /** @type {Element | null} */
  let live = $state(null)
  let version = $state(0)
  const running = start(description, rest, bound, id, () => live, {
    bind: (value) => {
      bound = value
    },
    call: (event, inside, args) => {
      callIn(rest, callbackProp(event), inside, args)
    },
  })
  const unwatch = running.page.host.watch(() => {
    version += 1
  })
  const tree = $derived.by(() => {
    void version
    return running.tree()
  })

  $effect.pre(() => {
    running.update(rest, bound)
  })
  $effect(() => {
    void tree
    running.drawn(live)
  })
  onMount(() => {
    running.drawn(live)
    running.page.host.begin()
    return () => {
      unwatch()
      running.stop()
    }
  })
</script>

<Part item={children} naming={running.page.naming} node={tree} {parts} sources={rest.sources} /><div
  bind:this={live}
  role="status"
></div>
