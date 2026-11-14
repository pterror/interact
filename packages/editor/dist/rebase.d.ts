/**
 * A text held elsewhere and the edits made to it here that it doesn't include yet: the edit that lays a newer text
 * from elsewhere over what is shown, the edits still not included rebased over it (as `@codemirror/collab` rebases).
 */
import { ChangeSet } from '@codemirror/state';
export type ChangeId = string;
export type Text = Readonly<{
    get: () => Readonly<{
        text: string;
        includes: ChangeId | undefined;
    }>;
    watch: (listener: () => void) => () => void;
}>;
export type Edit = (changes: readonly Readonly<{
    from: number;
    to: number;
    insert: string;
}>[], id: ChangeId) => void;
export type Pending = Readonly<{
    id: ChangeId;
    changes: ChangeSet;
}>;
/**
 * What identifies one edit made in an editor
 * @typedef {string} ChangeId
 */
/**
 * The text as it is elsewhere, and the latest of this editor's edits it includes (none if it includes none). Edits are
 * included in the order they were made.
 * @typedef {Readonly<{
 *   get: () => Readonly<{ text: string, includes: ChangeId | undefined }>,
 *   watch: (listener: () => void) => () => void,
 * }>} Text
 */
/**
 * One edit, handed on as it is made: replacements whose positions are all in the text before the edit
 * @typedef {(changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: ChangeId) => void} Edit
 */
/**
 * An edit made here, not yet included elsewhere
 * @typedef {Readonly<{ id: ChangeId, changes: ChangeSet }>} Pending
 */
/**
 * The replacements of a change set, in the text before it
 * @param {ChangeSet} changes - The changes
 * @returns {{ from: number, to: number, insert: string }[]} The replacements
 */
declare function replacementsOf(changes: ChangeSet): {
    from: number;
    to: number;
    insert: string;
}[];
/**
 * The change from one text to another, as one replacement of what differs
 * @param {string} was - The first text
 * @param {string} now - The other
 * @returns {ChangeSet} The change
 */
declare function changeBetween(was: string, now: string): ChangeSet;
/**
 * Takes in a text heard from elsewhere
 * @param {string} confirmed - The text elsewhere as last heard
 * @param {readonly Pending[]} pending - The edits made here since, in order
 * @param {Readonly<{ text: string, includes: ChangeId | undefined }>} heard - The text heard now
 * @param {(text: string) => import('@codemirror/state').Text} toText - A string as an editor's text
 * @returns {Readonly<{ other: ChangeSet, pending: Pending[] }>} The change that lays the heard text over what is
 *   shown (the text heard with every edit it doesn't include over it), and the edits it doesn't include, rebased
 */
declare function rebase(confirmed: string, pending: readonly Pending[], heard: Readonly<{
    text: string;
    includes: ChangeId | undefined;
}>, toText: (text: string) => import('@codemirror/state').Text): Readonly<{
    other: ChangeSet;
    pending: Pending[];
}>;
export { changeBetween, rebase, replacementsOf };
