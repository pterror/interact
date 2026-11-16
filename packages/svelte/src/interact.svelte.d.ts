import type { Description } from '@pterror/interact-core'
import type { Component } from 'svelte'

/** A widget described for a component, drawn by Svelte 5 */
declare const Interact: Component<
  { description: Description; bound?: unknown; [prop: string]: unknown },
  Record<string, never>,
  'bound'
>
export default Interact
