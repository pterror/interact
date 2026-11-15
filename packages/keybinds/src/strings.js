/**
 * Every word the ready-made UI shows, in English: cheatsheet(), settings(), palette(), contextMenu(), the inputs
 * (rebindKeys() and the others) and the formats that show a binding's parts. Each takes a `strings` option holding any
 * of these to replace; the rest stay English. A string that holds a value is a function of it.
 */

const defaultStrings = Object.freeze({
  actions: 'Actions',
  add: (/** @type {string} */ input) => `+ ${input}`,
  alreadyBound: (/** @type {string} */ label) => `Already bound to "${label}".`,
  alt: 'Alt',
  axisInput: 'Axis',
  back: 'Back',
  cancel: 'Cancel',
  click: 'Click',
  clickOrScroll: 'Click or scroll...',
  commands: 'Commands',
  ctrl: 'Ctrl',
  done: 'Done',
  dpadDown: 'D-pad ↓',
  dpadLeft: 'D-pad ←',
  dpadRight: 'D-pad →',
  dpadUp: 'D-pad ↑',
  escape: 'Esc',
  forward: 'Forward',
  gamepadInput: 'Gamepad',
  hold: 'Hold',
  home: 'Home',
  inverted: 'Inverted',
  invert: 'Invert',
  keyInput: 'Key',
  leftStickX: 'Left stick ↔',
  leftStickY: 'Left stick ↕',
  middle: 'Middle',
  mouseInput: 'Mouse',
  mouseX: 'Mouse ↔',
  mouseY: 'Mouse ↕',
  moveAxis: 'Move the mouse, tilt a stick, or press two keys...',
  other: 'Other',
  pressButton: 'Press a gamepad button...',
  pressKey: 'Press a key...',
  pressReleaseButton: 'Press and release a button...',
  pressReleaseKey: 'Press and release a key...',
  pressReleasePadButton: 'Press and release a gamepad button...',
  release: 'Release',
  remove: 'Remove',
  replace: 'Replace',
  reset: 'Reset',
  resetAll: 'Reset all',
  right: 'Right',
  rightStickX: 'Right stick ↔',
  rightStickY: 'Right stick ↕',
  scrollDown: 'Scroll ↓',
  scrollLeft: 'Scroll ←',
  scrollRight: 'Scroll →',
  scrollUp: 'Scroll ↑',
  shift: 'Shift',
  space: 'Space',
  start: 'Start',
  steps: 'Steps',
  stepsSoFar: (/** @type {string} */ steps) => `${steps} then...`,
  tab: 'Tab',
  tap: 'Tap',
  andThen: 'then',
  typeCommand: 'Type a command',
})

/** @typedef {{ -readonly [K in keyof typeof defaultStrings]: (typeof defaultStrings)[K] extends string ? string : (typeof defaultStrings)[K] }} Strings */

/**
 * The words to replace, by name
 * @typedef {Readonly<Partial<Strings>> | undefined} StringsOption
 */

/**
 * The strings an option asks for
 * @param {StringsOption} [strings] - Any strings to replace
 * @returns {Strings} Them, with English for the rest
 */
function withStrings(strings) {
  return strings === undefined ? defaultStrings : { ...defaultStrings, ...strings }
}

export { defaultStrings, withStrings }
