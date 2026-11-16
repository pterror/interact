import type { Key, Naming, Node } from '@pterror/interact-core'
import type { Component } from 'svelte'

/** One part of a widget and what is in it */
declare const Part: Component<{
  node: Node
  naming: Naming
  item: ((key: Key) => unknown) | undefined
  parts: Readonly<Record<string, unknown>>
}>
export default Part
