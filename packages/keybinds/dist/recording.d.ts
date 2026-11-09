/**
 * Recording a binding, as state: which slot is being recorded, what is captured (a press; or a release, hold or tap),
 * and, when several steps are, the steps so far, taken after a pause or when finished. A recorder (recordKey(), ...)
 * started for the state hands on what it heard; the binding goes to `done` and recording ends. Steps and a suffix
 * never go together.
 */
export type Suffix = '' | ':hold' | ':tap' | ':up';
export type Recorded<S> = Readonly<{
    slot: S;
    suffix: Suffix;
    steps?: undefined;
} | {
    slot: S;
    suffix: '';
    steps: readonly string[];
}>;
export type RecordingOptions<S> = Readonly<{
    done: (slot: S, binding: string) => void;
    pause?: number;
    takesSuffix?: (slot: S, binding: string) => boolean;
}>;
export type Recording<S> = Readonly<{
    get: () => Recorded<S> | undefined;
    watch: (listener: () => void) => () => void;
    start: (slot: S) => void;
    stop: () => void;
    capture: (suffix: ':hold' | ':tap' | ':up') => void;
    toggleSteps: () => void;
    heard: (binding: string) => void;
    finish: () => void;
}>;
/**
 * Recording, one slot at a time. `start` records a slot (in place of any other); `stop` ends without a binding;
 * `capture` switches to a suffix, or back to a press if it is the one captured; `toggleSteps` switches between one
 * step and several; `heard` takes what a recorder heard, a release with its ":up" as the recorder writes it; `finish`
 * takes the steps so far
 * @template S
 * @param {RecordingOptions<S>} options - What gets each binding recorded, for its slot; how long a pause takes the
 *   steps so far, in ms (default 1000); and whether a binding can be held, tapped or released (a scroll can't), for
 *   its slot (default: any can)
 * @returns {Recording<S>} The recording
 */
declare function recording<S>({ done, pause, takesSuffix }: RecordingOptions<S>): Recording<S>;
export { recording };
