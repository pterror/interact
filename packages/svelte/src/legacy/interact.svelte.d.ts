import type { Description } from '@pterror/interact-core'
import type { SvelteComponent } from 'svelte'

/** A widget described for a component, drawn by Svelte 4 */
declare class Interact extends SvelteComponent<{
  description: Description
  bound?: unknown
  [prop: string]: unknown
}> {}
export default Interact
