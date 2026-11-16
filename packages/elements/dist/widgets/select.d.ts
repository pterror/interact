/**
 * A select: the WAI-ARIA select-only combobox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), a trigger and a list, the
 * list in a popup against the trigger. Focus stays on the trigger, which names the active option by
 * `aria-activedescendant`, known from the list's `active` effects; the list is the windowed `list`, given the
 * select's value as its own, so it only reports what was chosen. The value follows the contract's rule: with
 * `value` in its props, a choice shows at once and is pending until the props confirm it or the app refuses it.
 * A character typed opens it and is the list's typeahead; Space is typed too while a prefix is being typed
 * (`until`). Given a visible label outside it (`label`), the trigger and the list are named by it, and a click
 * on it focuses the trigger.
 */
declare const SelectElement: typeof import("../element.js").InteractElement;
export { SelectElement };
