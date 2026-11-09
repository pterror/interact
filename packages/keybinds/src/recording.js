/**
 * Recording a binding, as state: which slot is being recorded, what is captured (a press; or a release, hold or tap),
 * and, when several steps are, the steps so far, taken after a pause or when finished. A recorder (recordKey(), ...)
 * started for the state hands on what it heard; the binding goes to `done` and recording ends. Steps and a suffix
 * never go together.
 */

/** @typedef {'' | ':hold' | ':tap' | ':up'} Suffix */

/**
 * What is being recorded: the slot; what is captured; and the steps so far, while several are
 * @template S
 * @typedef {Readonly<{ slot: S, suffix: Suffix, steps?: undefined } | { slot: S, suffix: '', steps: readonly string[] }>}
 *   Recorded
 */

/**
 * @template S
 * @typedef {Readonly<{
 *   done: (slot: S, binding: string) => void,
 *   pause?: number,
 *   takesSuffix?: (slot: S, binding: string) => boolean,
 * }>} RecordingOptions
 */

/**
 * @template S
 * @typedef {Readonly<{
 *   get: () => Recorded<S> | undefined,
 *   watch: (listener: () => void) => () => void,
 *   start: (slot: S) => void,
 *   stop: () => void,
 *   capture: (suffix: ':hold' | ':tap' | ':up') => void,
 *   toggleSteps: () => void,
 *   heard: (binding: string) => void,
 *   finish: () => void,
 * }>} Recording
 */

/** How long after a step recording waits before taking the steps so far, in ms **(P)** */
const PAUSE = 1000

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
function recording({ done, pause = PAUSE, takesSuffix = () => true }) {
  /** @type {Recorded<S> | undefined} */
  let state = undefined
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer = undefined
  /** @type {Set<() => void>} */
  const listeners = new Set()

  /**
   * @param {Recorded<S> | undefined} next - The state from now
   * @returns {void}
   */
  const become = (next) => {
    clearTimeout(timer)
    timer = undefined
    state = next
    for (const listener of listeners) {
      listener()
    }
  }

  /**
   * Ends with a binding
   * @param {S} slot - Its slot
   * @param {string} binding - The binding
   * @returns {void}
   */
  const end = (slot, binding) => {
    become(undefined)
    done(slot, binding)
  }

  const finish = () => {
    if (state?.steps !== undefined && state.steps.length > 0) {
      end(state.slot, state.steps.join(' '))
    }
  }

  return {
    capture(suffix) {
      if (state !== undefined) {
        become({ slot: state.slot, suffix: state.suffix === suffix ? '' : suffix })
      }
    },
    finish,
    get: () => state,
    heard(binding) {
      if (state === undefined || (state.suffix !== '' && !takesSuffix(state.slot, binding))) {
        return
      }
      if (state.steps === undefined) {
        end(state.slot, state.suffix === '' || state.suffix === ':up' ? binding : `${binding}${state.suffix}`)
        return
      }
      become({ slot: state.slot, steps: [...state.steps, binding], suffix: '' })
      timer = setTimeout(finish, pause)
    },
    start(slot) {
      become({ slot, suffix: '' })
    },
    stop() {
      become(undefined)
    },
    toggleSteps() {
      if (state !== undefined) {
        become(
          state.steps === undefined ? { slot: state.slot, steps: [], suffix: '' } : { slot: state.slot, suffix: '' },
        )
      }
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { recording }
