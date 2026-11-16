/**
 * The components' types, checked by the type checker: what this module writes is typed by them, and what it writes
 * wrong is an error they report
 */

import { expect, test } from 'bun:test'

/** @import Dialog from './widgets/dialog.svelte' */
/** @import { select } from './widgets/select.js' */

/** @typedef {Parameters<typeof Dialog<typeof select>>[1]} DialogProps */

/** @type {DialogProps['content']} */
const content = { items: ['Apple', 'Banana'], label: 'Fruit', placeholder: 'Choose', rows: 4 }

/** @type {DialogProps['content']} */
// @ts-expect-error -- the select inside takes no prop of that name
const wrong = { label: 'Fruit', placeholder: 'Choose', rows: 4, source: 'fruit', sorce: 'fruit' }

/** @type {NonNullable<DialogProps['parts']>} */
// @ts-expect-error -- no part of the dialog, or of the select inside it, has that name
const misnamed = { nowhere: undefined }

test("type the dialog's content by the select inside, and its parts by both", () => {
  expect([content.label, wrong.label, Object.keys(misnamed)]).toEqual(['Fruit', 'Fruit', ['nowhere']])
})
