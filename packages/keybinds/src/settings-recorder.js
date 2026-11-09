/**
 * The recorder that follows a recording: while a slot is recorded, its input's recorder runs (recording a release
 * when that is what is captured), started afresh each time the recording changes, and its bindings go to the
 * recording. Escape ends the recording, and goes no further.
 */

/** @typedef {'' | ':hold' | ':tap' | ':up'} Suffix */

/**
 * @typedef {Readonly<{ done: (binding: string) => void, release: boolean, ignore: (event: Event) => boolean }>}
 *   RecordOptions
 */

/**
 * @template S
 * @typedef {Readonly<{
 *   get: () => Readonly<{ slot: S, suffix: Suffix }> | undefined,
 *   watch: (listener: () => void) => () => void,
 *   heard: (binding: string) => void,
 *   stop: () => void,
 * }>} Recording
 */

/**
 * @template S
 * @typedef {Readonly<{
 *   recording: Recording<S>,
 *   recordOf: (slot: S) => ((options: RecordOptions) => () => void) | undefined,
 *   ignore?: (event: Event) => boolean,
 *   target?: EventTarget,
 * }>} SettingsRecorderOptions
 */

/** @type {() => void} */
const IDLE = () => undefined

/**
 * Runs recorders for a recording
 * @template S
 * @param {SettingsRecorderOptions<S>} options - The recording (recording()); a slot's recorder (its input's
 *   `record`); which events the recorder leaves alone (the recording's own controls); and where Escape is heard
 *   (default the window)
 * @returns {() => void} Stopping, and the recorder running
 */
function settingsRecorder({ ignore = () => false, recordOf, recording, target = globalThis }) {
  let running = IDLE
  const follow = () => {
    running()
    running = IDLE
    const state = recording.get()
    const record = state === undefined ? undefined : recordOf(state.slot)
    if (state !== undefined && record !== undefined) {
      running = record({ done: recording.heard, ignore, release: state.suffix === ':up' })
    }
  }
  /**
   * @param {Event} event - A key going down
   * @returns {void}
   */
  const escape = (event) => {
    if (event instanceof KeyboardEvent && event.key === 'Escape' && recording.get() !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      recording.stop()
    }
  }
  const stop = recording.watch(follow)
  target.addEventListener('keydown', escape, true)
  follow()
  return () => {
    stop()
    target.removeEventListener('keydown', escape, true)
    running()
  }
}

export { settingsRecorder }
