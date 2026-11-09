/**
 * The recorder that follows a recording: while a slot is recorded, its input's recorder runs (recording a release
 * when that is what is captured), started afresh each time the recording changes, and its bindings go to the
 * recording. Escape ends the recording, and goes no further.
 */
export type Suffix = '' | ':hold' | ':tap' | ':up';
export type RecordOptions = Readonly<{
    done: (binding: string) => void;
    release: boolean;
    ignore: (event: Event) => boolean;
}>;
export type Recording<S> = Readonly<{
    get: () => Readonly<{
        slot: S;
        suffix: Suffix;
    }> | undefined;
    watch: (listener: () => void) => () => void;
    heard: (binding: string) => void;
    stop: () => void;
}>;
export type SettingsRecorderOptions<S> = Readonly<{
    recording: Recording<S>;
    recordOf: (slot: S) => ((options: RecordOptions) => () => void) | undefined;
    ignore?: (event: Event) => boolean;
    target?: EventTarget;
}>;
/**
 * Runs recorders for a recording
 * @template S
 * @param {SettingsRecorderOptions<S>} options - The recording (recording()); a slot's recorder (its input's
 *   `record`); which events the recorder leaves alone (the recording's own controls); and where Escape is heard
 *   (default the window)
 * @returns {() => void} Stopping, and the recorder running
 */
declare function settingsRecorder<S>({ ignore, recordOf, recording, target }: SettingsRecorderOptions<S>): () => void;
export { settingsRecorder };
