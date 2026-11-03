/**
 * The settings panel's pieces: its frame, a binding shown as keys with its switches, the prompt while one is recorded,
 * the question when a binding is taken, and the buttons that add one.
 */
import type { InputUI } from './input.js';
/**
 * A button with its class, part names and label, doing something when clicked
 * @param {Readonly<{ className: string, part: string, text: string }>} made - Its class, part names and label
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The button
 */
declare function button(made: Readonly<{
    className: string;
    part: string;
    text: string;
}>, click: () => void): HTMLButtonElement;
/**
 * A switch: a button that shows whether it's on
 * @param {Readonly<{ className: string, label: string, name: string, on: boolean }>} made - Its class, label, part
 *   name ("binding-release" is also "binding-release-on" while on), and whether it's on
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The switch
 */
declare function toggle({ className, label, name, on }: Readonly<{
    className: string;
    label: string;
    name: string;
    on: boolean;
}>, click: () => void): HTMLButtonElement;
/**
 * Whether an event happened on one of the switches in the recording prompt, whose clicks aren't recorded
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
declare function onSwitch(event: Event): boolean;
/**
 * The panel's frame: a backdrop, and the dialog its contents go in
 * @param {ShadowRoot} shadow - The panel's shadow root
 * @returns {Readonly<{ backdrop: HTMLDivElement, dialog: HTMLDivElement }>} The backdrop, and the dialog
 */
declare function settingsMarkup(shadow: ShadowRoot): Readonly<{
    backdrop: HTMLDivElement;
    dialog: HTMLDivElement;
}>;
/**
 * The panel's header: its title, and a button that resets every binding
 * @param {() => void} resetAll - Resets every binding
 * @returns {HTMLDivElement} The header
 */
declare function headerOf(resetAll: () => void): HTMLDivElement;
export type ChipActions = Readonly<{
    flip: (flipped: string) => void;
    record: () => void;
    remove: () => void;
}>;
/**
 * What a binding chip does: record it again, switch it to another form, or remove it
 * @typedef {Readonly<{ flip: (flipped: string) => void, record: () => void, remove: () => void }>} ChipActions
 */
/**
 * A binding, shown as its keys, with its switches and a button that removes it
 * @param {InputUI} input - The input it's through
 * @param {Readonly<{ binding: string, releases: boolean }>} shown - The binding, and whether releases are on
 * @param {ChipActions} actions - What it does
 * @returns {HTMLSpanElement} The chip
 */
declare function chipOf(input: InputUI, shown: Readonly<{
    binding: string;
    releases: boolean;
}>, { flip, record, remove }: ChipActions): HTMLSpanElement;
/**
 * The box a binding being recorded is shown in
 * @returns {HTMLSpanElement} The box
 */
declare function recordingBox(): HTMLSpanElement;
/**
 * The question shown when a binding is taken: replace the other command's, or cancel
 * @param {string} label - The other command's label
 * @param {Readonly<{ accept: () => void, cancel: () => void }>} answers - What each answer does
 * @returns {HTMLSpanElement} The question
 */
declare function conflictOf(label: string, { accept, cancel }: Readonly<{
    accept: () => void;
    cancel: () => void;
}>): HTMLSpanElement;
/**
 * The buttons that start recording a new binding, one for each input that can be recorded now
 * @param {readonly InputUI[]} inputs - The inputs shown on the row
 * @param {(input: InputUI) => void} start - Starts recording through one
 * @returns {HTMLSpanElement} The buttons
 */
declare function addButtons(inputs: readonly InputUI[], start: (input: InputUI) => void): HTMLSpanElement;
export { addButtons, button, chipOf, conflictOf, headerOf, onSwitch, recordingBox, settingsMarkup, toggle };
