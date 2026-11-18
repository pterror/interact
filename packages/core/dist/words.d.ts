/**
 * What the widgets' announcements say, in English, by message id. An app in another language, or wanting other words,
 * passes its own for any of them; a message's values are as the widget sent them, and `name` names an item.
 */
import type { Out } from './compose.js';
import type { Data, Key } from './contract.js';
export type Words = Readonly<{
    [message: string]: (values: Readonly<{
        [field: string]: Data;
    }>, name: (key: Key) => string) => string;
}>;
/** @type {Words} */
declare const english: Words;
/**
 * The words for a message
 * @param {Words} words - The app's words, over the English ones
 * @param {string} message - The message id
 * @param {Readonly<{ [field: string]: Data }>} values - What it is about
 * @param {(key: Key) => string} name - The host's name for an item
 * @returns {string} What to say; the message id itself when nothing words it
 */
declare function say(words: Words, message: string, values: Readonly<{
    [field: string]: Data;
}>, name: (key: Key) => string): string;
/**
 * What an `announce` effect says, worded
 * @param {Out} out - The effect
 * @param {Words} words - The app's words
 * @param {(key: Key) => string} name - An item's name
 * @returns {string} The words
 */
declare function announcement(out: Out, words: Words, name: (key: Key) => string): string;
export { announcement, english, say };
