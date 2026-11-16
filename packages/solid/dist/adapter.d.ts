/**
 * What the package's modules need of Solid that its major versions spell or schedule differently, as one contract:
 * each version's adapter (`solid-1/adapter.js`, `solid-2/adapter.js`) gives it from that version's packages, and each
 * entry binds the modules to one. The rest of Solid they import from `solid-js` itself, by the names every supported
 * version shares.
 *
 * A write is applied when the version applies it: at once in Solid 1 (or at the end of the batch it is in), at the
 * next flush in Solid 2 (a microtask later, or `flush()`). Every timing below is relative to that.
 */

import type { Key } from '@pterror/interact-core'
import type { Accessor, Component } from 'solid-js'

/** What a Solid component draws, in whichever version is installed */
export type SolidElement = ReturnType<Component>

/** Props, as a record */
export type Props = Readonly<Record<string, unknown>>

/** Which part a replaced part is */
export type PartOf = Readonly<{ name: string; item: Key | null }>

/**
 * The props a replaced part is given: its attributes (its id among them), which its element takes, its contents, and
 * which part it is
 */
export type PartProps = Readonly<Record<string, unknown>> & Readonly<{ children?: SolidElement; part: PartOf }>

/** The Solid APIs that differ between the major versions */
export type Adapter = Readonly<{
  /** Whether this is the server's build */
  isServer: boolean
  /**
   * A signal holding any value as it is (a function too), which may be written from anywhere: the package's signals
   * mirror state outside Solid, which changes whenever that state does
   */
  signal: <T>(value: T) => readonly [Accessor<T>, (value: T) => void]
  /** A memo that tells its readers only when `equals` says the value is another one */
  memo: <T>(compute: () => T, equals: (last: T, next: T) => boolean) => Accessor<T>
  /**
   * Runs `apply` with `compute`'s value now and each time it is computed again, as soon as the version applies a write
   * `compute` read (in Solid 1 with the write, before any effect)
   */
  watch: <T>(compute: () => T, apply: (value: T) => void) => void
  /** A render effect split in two, `compute` tracked and `apply` not, `apply` given each value (`defer`: but the first) */
  renderEffect: <T>(compute: () => T, apply: (value: T) => void, defer: boolean) => void
  /** A user effect, split as `renderEffect` is: it applies after the version has drawn the change */
  effect: <T>(compute: () => T, apply: (value: T) => void, defer: boolean) => void
  /**
   * Runs `run` once the component it is called in has been drawn and its changes applied, and the cleanup `run` gives
   * when that component goes
   */
  settled: (run: () => (() => void) | undefined) => void
  /** Applies the writes `run` makes together */
  batch: (run: () => void) => void
  /** Whether a computation is reading now */
  tracking: () => boolean
  /**
   * A list mapped by identity, each value mapped once while it stays in the list, its index tracked; on a server, each
   * mapped only when the list is read, as hydration keys them in the order they are drawn
   */
  contents: <T, U>(list: Accessor<readonly T[]>, map: (value: T, index: Accessor<number>) => U) => Accessor<U[]>
  /**
   * An element of a tag, drawn so a server renders it and a client hydrates it, its props those of each source in turn
   * (one given as an accessor followed as it changes)
   */
  element: (tag: string, ...sources: readonly (Props | Accessor<Props>)[]) => SolidElement
  /** A part drawn by the app's component, given its attributes, the rest of its props and which part it is */
  part: (component: Component<PartProps>, attributes: Accessor<Props>, rest: Props, part: PartOf) => SolidElement
}>
