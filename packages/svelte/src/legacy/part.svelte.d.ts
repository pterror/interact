import type { Naming, Node, Source } from '@pterror/interact-core'
import type { SvelteComponent } from 'svelte'

/** One part of a widget and what is in it */
declare class Part extends SvelteComponent<{
  node: Node
  naming: Naming
  item?: unknown
  parts?: Readonly<Record<string, unknown>>
  sources?: Readonly<Record<string, Source>> | undefined
}> {}
export default Part
