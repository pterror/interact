/**
 * A settings panel's editing: recording a binding, the question when one is taken, and what each of the panel's
 * controls does.
 */
import type { InputUI } from './input.js';
import type { RecordingState } from './settings-record.js';
import type { Conflict, SettingsActions } from './settings-view.js';
import type { AnyBindingsStore } from './store.js';
export type SessionHooks = Readonly<{
    changed: () => void;
    dispatch: (event: Event) => void;
    inputs: () => readonly InputUI[];
    pause: () => number;
    store: () => AnyBindingsStore | undefined;
    window: () => Window;
}>;
/**
 * What a session works on and tells: the store and inputs, the window to record in, how long a sequence waits after
 * a step, that what's shown changed, and where its events go
 * @typedef {Readonly<{ changed: () => void, dispatch: (event: Event) => void, inputs: () => readonly InputUI[], pause:
 *   () => number, store: () => AnyBindingsStore | undefined, window: () => Window }>} SessionHooks
 */
/** Editing in a settings panel */
declare class SettingsSession {
    #private;
    /**
     * What the panel's controls do
     * @readonly
     * @type {SettingsActions}
     */
    readonly actions: SettingsActions;
    /**
     * Edits for a panel
     * @param {SessionHooks} hooks - What it works on and tells
     */
    constructor(hooks: SessionHooks);
    /** @returns {Conflict | undefined} A taken binding, waiting on whether to replace the other command's */
    get conflict(): Conflict | undefined;
    /** @returns {RecordingState} Recording as it is now */
    get recording(): RecordingState;
    /**
     * Resets every command to its defaults
     * @returns {void}
     */
    resetAll(): void;
    /**
     * Stops recording, and forgets any question
     * @returns {void}
     */
    stop(): void;
}
export { SettingsSession };
