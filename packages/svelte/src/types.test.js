/**
 * The components' types, checked by the type checker: each `true` below is typed by a comparison of them that only
 * holds while they are as the test says
 */

import { expect, test } from 'bun:test'

/** @import Dialog from './widgets/dialog.svelte' */
/** @import { select } from './widgets/select.js' */

/** @typedef {Parameters<typeof Dialog<typeof select>>[1]} DialogProps */
/** @typedef {DialogProps['content']} Content */

/**
 * Whether two types are the same
 * @template A, B
 * @typedef {[A] extends [B] ? ([B] extends [A] ? true : false) : false} Same
 */

/** @type {Same<Content['label'], string>} */
const labelled = true

/** @type {'sorce' extends keyof Content ? false : true} */
const noOtherProp = true

/** @type {Same<Content['items'], readonly import('@pterror/interact-core').Item[] | undefined>} */
const takesItems = true

/** @type {Same<keyof NonNullable<DialogProps['parts']>, 'close' | 'content' | 'dialog' | 'list' | 'option' | 'popover' | 'root' | 'title' | 'trigger'>} */
const parts = true

/** @type {DialogProps['content']} */
const content = { disabled: false, items: ['Apple', 'Banana'], label: 'Fruit', placeholder: 'Choose', rows: 4 }

test("type the dialog's content by the select inside, and its parts by both", () => {
  expect([labelled, noOtherProp, takesItems, parts, content.label]).toEqual([true, true, true, true, 'Fruit'])
})
