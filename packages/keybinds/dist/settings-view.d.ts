/**
 * The settings panel's contents: a group per category, a row per command or axis with its bindings, the prompt where
 * one is being recorded, and the question where a binding is taken.
 */
import type { InputUI } from './input.js';
import type { RecordingState, Slot } from './settings-record.js';
import type { AnyBindingsStore } from './store.js';
export type Conflict = Readonly<{
    binding: string;
    flip: boolean;
    id: string;
    label: string;
    slot: Slot;
}>;
export type SettingsView = Readonly<{
    conflict: Conflict | undefined;
    holds: boolean;
    inputs: readonly InputUI[];
    recording: RecordingState;
    releases: boolean;
    sequences: boolean;
    store: AnyBindingsStore;
}>;
export type SettingsActions = Readonly<{
    accept: () => void;
    cancel: () => void;
    capture: (suffix: string) => void;
    finish: () => void;
    flip: (slot: Slot, flipped: string) => void;
    record: (slot: Slot) => void;
    remove: (slot: Slot) => void;
    reset: (id: string) => void;
    toggleSteps: () => void;
}>;
export type Panel = Readonly<{
    actions: SettingsActions;
    view: SettingsView;
}>;
/**
 * A group for each category, in the order the store first has them, of the rows that aren't hidden
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLDivElement[]} The groups
 */
declare function groupsOf(panel: Panel): HTMLDivElement[];
export { groupsOf };
