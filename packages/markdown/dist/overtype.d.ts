/**
 * Overtype (from cyoa's `language.ts`): typing the character that is already next, where it closes something (the
 * `**` after bold words, a link's `]`), steps over it instead of writing it a second time. A phone's keyboard often
 * sends a keystroke as the word being typed replaced by that word and one more character; that is the same keystroke.
 * It is an extension an app adds or leaves out.
 */
/**
 * Steps over a closing mark typed where it already is
 * @returns {import('@codemirror/state').Extension} The extension
 */
declare function overtype(): import('@codemirror/state').Extension;
export { overtype };
