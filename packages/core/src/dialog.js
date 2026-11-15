/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
 * `open` is always the app's: Escape (one the content didn't take, heard as it bubbles from the content) and the close
 * button emit `change` with `false`. Opening focuses the part the app names. Keeping focus inside while open, and
 * giving it back on close, is what `aria-modal` asks of the host.
 */

import { compose } from './compose.js'
import { part, ref } from './contract.js'

/** @import { Change, Click, Focus, KeyDown, PreventDefault, PropsInput, Ref } from './contract.js' */
/** @import { AnyWidget, Composite, CompositeSpec, PropsOf, Send } from './compose.js' */

/**
 * @template CP
 * @typedef {Readonly<{ title: string, closeLabel: string, open: boolean, content: CP }>} DialogProps
 */

/**
 * @template CP
 * @typedef {Readonly<{ title: string, closeLabel: string, open: boolean, contentProps: CP }>} DialogOwn
 */

/** @template CP @typedef {KeyDown | Click | PropsInput<DialogProps<CP>>} DialogInput */
/** @typedef {Change<boolean> | Focus | PreventDefault | Send<'content'>} DialogEffect */

/** @type {readonly DialogEffect[]} */
const NONE = []
/** @type {readonly DialogEffect[]} */
const CLOSE = [{ type: 'preventDefault' }, { type: 'change', value: false }]

/**
 * A modal dialog around a widget
 * @template {AnyWidget} W
 * @param {W} content - The widget inside
 * @param {Ref['part']} initialFocus - The part focused when it opens, from the dialog (`['content', ...]` is inside
 *   the content)
 * @returns {Composite<DialogProps<PropsOf<W>>, DialogOwn<PropsOf<W>>, DialogInput<PropsOf<W>>, DialogEffect, Readonly<{ content: W }>>}
 *   The dialog
 */
function dialog(content, initialFocus) {
  /** @type {CompositeSpec<DialogProps<PropsOf<W>>, DialogOwn<PropsOf<W>>, DialogInput<PropsOf<W>>, DialogEffect, Readonly<{ content: W }>>} */
  const spec = {
    bubble: {
      content: {
        keydown: (state, input, defaultPrevented) =>
          input.key === 'Escape' && !defaultPrevented && state.open ? [state, CLOSE] : [state, NONE],
      },
    },
    children: { content },
    init: (props) => ({ closeLabel: props.closeLabel, contentProps: props.content, open: false, title: props.title }),
    props: { content: (state) => state.contentProps },
    step: (state, input) => {
      switch (input.type) {
        case 'props': {
          const { closeLabel, content: contentProps, open, title } = input.props
          /** @type {readonly DialogEffect[]} */
          const focus = open && !state.open ? [{ item: null, part: initialFocus, type: 'focus' }] : NONE
          return [{ ...state, closeLabel, contentProps, open, title }, focus]
        }
        case 'click': {
          return input.part === 'close' && state.open ? [state, CLOSE] : [state, NONE]
        }
        case 'keydown': {
          return input.key === 'Escape' && state.open ? [state, CLOSE] : [state, NONE]
        }
        default: {
          return [state, NONE]
        }
      }
    },
    view: (state) => ({
      close: part({
        content: [{ text: state.closeLabel }],
        listens: ['click', 'keydown'],
        role: 'button',
        tabindex: 0,
      }),
      root: part({
        aria: { labelledby: ref(['title'], null), modal: true },
        content: [{ part: 'title' }, { child: 'content' }, { part: 'close' }],
        hidden: !state.open,
        listens: ['keydown'],
        role: 'dialog',
        tabindex: -1,
      }),
      title: part({ aria: { level: 2 }, content: [{ text: state.title }], role: 'heading' }),
    }),
  }
  return compose(spec)
}

export { dialog }
