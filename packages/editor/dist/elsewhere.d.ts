/**
 * The one mark of a transaction that lays in a change made elsewhere (a text heard from where it lives, a segment laid
 * in, a value put), shared by every editor module that dispatches one, so whatever hears an editor's transactions tells
 * them apart from the person's in one way.
 */
/** @type {import('@codemirror/state').AnnotationType<boolean>} */
declare const elsewhere: import('@codemirror/state').AnnotationType<boolean>;
/**
 * Whether a transaction lays in a change made elsewhere, not one the person made
 * @param {import('@codemirror/state').Transaction} transaction - The transaction
 * @returns {boolean} Whether it does
 */
declare function fromElsewhere(transaction: import('@codemirror/state').Transaction): boolean;
export { elsewhere, fromElsewhere };
