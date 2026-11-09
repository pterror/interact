/**
 * What a settings panel shows in place of the binding being recorded, a `data-keybinds=prompt` span: what to do, or
 * the steps so far; and the switches for what is captured, for the syntax that is on and a press's input (not an
 * axis): Release (`data-keybinds=record-release`), Hold and Tap (`record-hold`, `record-tap`), several steps
 * (`record-steps`), each `aria-pressed`, and Done once there are steps (`record-done`).
 */

/** @typedef {'' | ':hold' | ':tap' | ':up'} Suffix */

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/**
 * @template {Readonly<{ field: Field }>} S
 * @typedef {Readonly<{ slot: S, suffix: Suffix, steps?: readonly string[] | undefined }>} Recorded
 */

/**
 * @template {Readonly<{ field: Field }>} S
 * @typedef {Readonly<{
 *   prompt: (slot: S, release: boolean) => string,
 *   parts: (slot: S, binding: string) => readonly string[],
 *   recording: Readonly<{ capture: (suffix: ':hold' | ':tap' | ':up') => void, toggleSteps: () => void,
 *     finish: () => void }>,
 *   releases?: boolean,
 *   holds?: boolean,
 *   sequences?: boolean,
 * }>} SettingsPromptOptions
 */

/**
 * A switch
 * @param {string} name - Its `data-keybinds`
 * @param {string} text - Its text
 * @param {boolean | undefined} on - Whether it is on; none for a button
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The switch
 */
function toggle(name, text, on, click) {
  const made = document.createElement('button')
  made.type = 'button'
  made.dataset['keybinds'] = name
  made.textContent = text
  if (on !== undefined) {
    made.setAttribute('aria-pressed', String(on))
  }
  made.addEventListener('click', click)
  return made
}

/**
 * Makes prompts
 * @template {Readonly<{ field: Field }>} S
 * @param {SettingsPromptOptions<S>} options - What to do, for a slot's input (a release, if asked); a binding's
 *   display parts; the recording (recording()); and which syntax is on
 * @returns {(recorded: Recorded<S>) => HTMLElement} The prompt for what is being recorded
 */
function settingsPrompt({ holds = false, parts, prompt, recording, releases = false, sequences = false }) {
  return ({ slot, steps, suffix }) => {
    const text = document.createElement('span')
    text.textContent =
      steps !== undefined && steps.length > 0
        ? `${parts(slot, steps.join(' ')).join(' ')} then...`
        : prompt(slot, suffix === ':up')
    /** @type {(name: string, text: string, captured: ':hold' | ':tap' | ':up') => HTMLButtonElement} */
    const captures = (name, label, captured) =>
      toggle(name, label, suffix === captured, () => {
        recording.capture(captured)
      })
    const press = slot.field !== 'axes'
    const element = document.createElement('span')
    element.dataset['keybinds'] = 'prompt'
    element.append(
      text,
      ...(press && releases ? [captures('record-release', 'Release', ':up')] : []),
      ...(press && holds ? [captures('record-hold', 'Hold', ':hold'), captures('record-tap', 'Tap', ':tap')] : []),
      ...(press && sequences ? [toggle('record-steps', 'Steps', steps !== undefined, recording.toggleSteps)] : []),
      ...(steps !== undefined && steps.length > 0 ? [toggle('record-done', 'Done', undefined, recording.finish)] : []),
    )
    return element
  }
}

export { settingsPrompt }
