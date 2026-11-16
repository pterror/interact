export { define, InteractElement } from './element.js';
export { register } from './register.js';
export { DialogElement } from './widgets/dialog.js';
export { ListElement } from './widgets/list.js';
export { MenuElement } from './widgets/menu.js';
export { ReorderListElement } from './widgets/reorder-list.js';
export { SelectElement } from './widgets/select.js';
import type * as Tags from './tags.js';
export type Tag = Tags.Tag;
/** @import * as Tags from './tags.js' */
/**
 * Each element's tag (with them, `HTMLElementTagNameMap` and `document.createElement` type every element)
 * @typedef {Tags.Tag} Tag
 */
