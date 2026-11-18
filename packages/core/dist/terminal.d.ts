/**
 * Draws any widget's view in a terminal, generically, by role: a button or combobox is one line in brackets, a
 * listbox or menu a line per option or item, a dialog a box, a heading bold; a popup with an anchor is drawn over
 * what is below its anchor, from the anchor's column, or over what is above it when it doesn't fit below the screen's
 * height; the focused part and the option a focused
 * part names by `aria-activedescendant` are drawn inverted, a selected option with a tick, a disabled one dim. Raw-mode
 * key presses become `keydown` with UI Events key values, and xterm's SGR mouse reports become pointer events and
 * clicks on the part under the pointer, in cells (from 0): a widget's thresholds are props, so the app gives them in
 * cells. The app can draw any part itself (`parts`).
 *
 * What a browser does that a terminal doesn't, this does: focus (Tab through the parts with `tabindex` 0, kept inside
 * a shown `aria-modal` part, given back when it closes), a click on a button for Enter and Space, focus on a press,
 * an event heard by the innermost part listening for it, and a press outside the popup shown last heard by it.
 */
import type { Node as Part } from './compose.js';
import type { Key } from './contract.js';
import type { Host, HostOptions } from './host.js';
import type { Words } from './words.js';
export type TerminalInput = Readonly<{
    on: (event: 'data', listener: (chunk: string) => void) => unknown;
    off: (event: 'data', listener: (chunk: string) => void) => unknown;
}>;
export type DrawPart = (node: Part, look: Readonly<{
    text: string;
    lit: boolean;
}>) => string;
export type TerminalOptions = HostOptions & Readonly<{
    input: TerminalInput;
    write: (text: string) => void;
    columns: number;
    height?: number;
    item?: (key: Key) => string;
    words?: Words;
    parts?: Readonly<{
        [name: string]: DrawPart;
    }>;
}>;
export type TerminalEvent = Readonly<{
    kind: 'key';
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
}> | Readonly<{
    kind: 'mouse';
    button: number;
    x: number;
    y: number;
    motion: boolean;
    release: boolean;
}> | Readonly<{
    kind: 'quit';
}>;
/**
 * What a chunk of raw terminal input says
 * @param {string} text - The input
 * @returns {TerminalEvent[]} The keys and mouse events, in order
 */
declare function parseInput(text: string): TerminalEvent[];
export type Segment = Readonly<{
    text: string;
    key: string | null;
    style: '' | 'inverse' | 'dim' | 'bold';
}>;
export type Layout = Readonly<{
    rows: readonly (readonly Segment[])[];
    nodes: ReadonlyMap<string, Part>;
    parents: ReadonlyMap<string, string>;
}>;
/**
 * Lays a tree out as rows, by role
 * @param {Part} tree - The root
 * @param {Readonly<{ focused: string | null, item: (content: Readonly<{ item: Key, source: string }>) => string, parts: Readonly<{ [name: string]: DrawPart }>, height?: number }>} options
 *   - Which part has focus, the host's text for items, the parts the app draws, and the screen's height
 * @returns {Layout} The rows, every part by identity, and each part's parent
 */
declare function layout(tree: Part, { focused, height, item, parts }: Readonly<{
    focused: string | null;
    item: (content: Readonly<{
        item: Key;
        source: string;
    }>) => string;
    parts: Readonly<{
        [name: string]: DrawPart;
    }>;
    height?: number;
}>): Layout;
/**
 * Draws a widget in a terminal, and runs it on the terminal's input
 * @param {TerminalOptions} options - The widget, its props, how the host words items and announcements, what carries
 *   out the app's effects, and the terminal
 * @returns {Readonly<{ host: Host, feed: (text: string) => void, screen: () => readonly string[], stop: () => void }>}
 *   The running widget, input fed as the terminal would, the screen's rows as plain text, and stopping
 */
declare function renderTerminal(options: TerminalOptions): Readonly<{
    host: Host;
    feed: (text: string) => void;
    screen: () => readonly string[];
    stop: () => void;
}>;
export { layout, parseInput, renderTerminal };
