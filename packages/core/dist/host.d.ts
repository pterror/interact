/**
 * The host side of a widget: holds its state and props, delivers inputs, and carries out what needs the platform.
 * `wake` is the platform's timer; an `ask` or `move` about a source the app passed is answered from that source (its
 * `answer` or `found` back to the widget that asked, `confirmed` or `refused` for a move, `changed` to every widget
 * that asked about it when it changes). Moves go to a source one at a time, in the order they were made, since each was made
 * against the order the ones before it left. Everything else goes to `effect`: the renderer's effects (focus, preventing a default,
 * announcing) to the renderer, the rest on to the app. Host events pass through `translate` first, which is where keys
 * are rebound: it gives the standard key a widget expects. Not pure: this is where the clock, timers and sources are.
 * Time is `performance.now()`, the clock DOM events' `timeStamp` uses.
 */
import type { AnyGenerated, AnyWidget, Node, Out } from './compose.js';
import type { Key, Path } from './contract.js';
export type Window = Readonly<{
    from: number;
    keys: readonly Key[];
    count: number;
}>;
export type Source = Readonly<{
    read: (question: Readonly<{
        ranks: readonly [number, number];
    }> | Readonly<{
        locate: Key;
        rows: number;
    }>) => Window | Promise<Window>;
    move: (item: Key, target: Key, after: boolean) => boolean | Promise<boolean>;
    watch: (listener: () => void) => () => void;
    text?: (key: Key) => string;
    find?: (prefix: string, at: Key | null, next: boolean) => Key | null | Promise<Key | null>;
}>;
export type Host = Readonly<{
    dispatch: (owner: Path, input: unknown) => readonly Out[];
    setProps: (props: unknown) => void;
    state: () => unknown;
    tree: () => Node;
    watch: (listener: () => void) => () => void;
    begin: () => void;
    stop: () => void;
}>;
export type HostOptions = Readonly<{
    widget: AnyWidget | AnyGenerated;
    props: unknown;
    effect?: (out: Out, host: Host) => void;
    sources?: Readonly<{
        [name: string]: Source;
    }>;
    translate?: (input: Readonly<{
        [field: string]: unknown;
    }>) => Readonly<{
        [field: string]: unknown;
    }> | null;
}>;
/** @import { AnyGenerated, AnyWidget, Node, Out } from './compose.js' */
/** @import { Key, Path } from './contract.js' */
/**
 * A window of a collection: the keys from rank `from`, and how many items there are
 * @typedef {Readonly<{ from: number, keys: readonly Key[], count: number }>} Window
 */
/**
 * A collection the host holds: windows read from it (now or later), moves made in it (`true` once made, `false` if
 * refused), and hearing it change; optionally an item's text, for each key it has answered with (what the item is
 * named and drawn as by default), and finding a key by the start of its text (the first from `at` on, after it when
 * `next`, wrapping round, ignoring case; `null` for none), now or later. A source that can't find answers every find
 * with none
 * @typedef {Readonly<{
 *   read: (question: Readonly<{ ranks: readonly [number, number] }> | Readonly<{ locate: Key, rows: number }>) => Window | Promise<Window>,
 *   move: (item: Key, target: Key, after: boolean) => boolean | Promise<boolean>,
 *   watch: (listener: () => void) => () => void,
 *   text?: (key: Key) => string,
 *   find?: (prefix: string, at: Key | null, next: boolean) => Key | null | Promise<Key | null>,
 * }>} Source
 */
/**
 * A widget being run. `state` is its state now; the next input may change that state in place, so it is read, not
 * kept
 * @typedef {Readonly<{
 *   dispatch: (owner: Path, input: unknown) => readonly Out[],
 *   setProps: (props: unknown) => void,
 *   state: () => unknown,
 *   tree: () => Node,
 *   watch: (listener: () => void) => () => void,
 *   begin: () => void,
 *   stop: () => void,
 * }>} Host
 */
/**
 * What runs a widget: the widget and its props; optionally the app's effects, its collections by source name, and its
 * key bindings
 * @typedef {Readonly<{
 *   widget: AnyWidget | AnyGenerated,
 *   props: unknown,
 *   effect?: (out: Out, host: Host) => void,
 *   sources?: Readonly<{ [name: string]: Source }>,
 *   translate?: (input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null,
 * }>} HostOptions
 */
/**
 * Finds a key by the start of its text in keys in memory, as a source finds it
 * @param {readonly Key[]} keys - The keys
 * @param {(key: Key) => string} textOf - Each one's text
 * @param {string} prefix - What its text starts with, ignoring case
 * @param {Key | null} at - The key to look from, or `null` for the first
 * @param {boolean} next - Whether to look from the key after it
 * @returns {Key | null} The first key found, wrapping round, or `null`
 */
declare function findIn(keys: readonly Key[], textOf: (key: Key) => string, prefix: string, at: Key | null, next: boolean): Key | null;
/**
 * A collection in memory, as a source: its keys in order, which a move reorders, and each one's text
 * @param {readonly Key[]} initial - The keys
 * @param {(key: Key) => string} textOf - An item's text (by default its key as text)
 * @returns {Source & Readonly<{ keys: () => readonly Key[], set: (keys: readonly Key[]) => void, text: (key: Key) => string }>}
 *   The source, and its keys to read and set
 */
declare function arraySource(initial: readonly Key[], textOf?: (key: Key) => string): Source & Readonly<{
    keys: () => readonly Key[];
    set: (keys: readonly Key[]) => void;
    text: (key: Key) => string;
}>;
/**
 * Runs a widget. It starts at once; the effects of starting are carried out by `begin`, once whoever draws it is
 * listening
 * @param {HostOptions} options - The widget, its props, and how the app takes part
 * @returns {Host} The running widget
 */
declare function host(options: HostOptions): Host;
export { arraySource, findIn, host };
