/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
 * `open` is always the app's, by the contract's rule: Escape (one the content didn't take, heard as it bubbles from
 * the content) and the close button close it at once, pending, and emit `change` with `false`; the props confirm it,
 * or `refused` opens it again. Opening focuses the part the app names. Keeping focus inside while open, and giving it
 * back on close, is what `aria-modal` asks of the host.
 */

import { compose } from './compose.js'
import { part, ref } from './contract.js'
import { change, fromApp, pending, refuse, shown } from './pending.js'

/** @import { Change, Click, Focus, KeyDown, PreventDefault, PropsInput, Ref, Refused, Result } from './contract.js' */
/** @import { AnyWidget, PropsOf } from './compose.js' */
/** @import { Pending } from './pending.js' */

/**
 * @template CP
 * @typedef {Readonly<{ title: string, closeLabel: string, open: boolean, content: CP }>} DialogProps
 */

/**
 * @template CP
 * @typedef {Readonly<{ title: string, closeLabel: string, open: Pending<boolean>, content: CP }>} DialogOwn
 */

/** @template CP @typedef {KeyDown | Click | Refused | PropsInput<DialogProps<CP>>} DialogInput */
/** @typedef {Change<boolean> | Focus | PreventDefault} DialogEffect */

/** @type {readonly DialogEffect[]} */
const NONE = []

/**
 * Closes the dialog, pending the app's word
 * @template CP
 * @param {DialogOwn<CP>} own - The dialog
 * @returns {Result<DialogOwn<CP>, DialogEffect>} The dialog, closed, and its effects
 */
function close(own) {
  if (!shown(own.open)) {
    return [own, NONE]
  }
  const [open, id] = change(own.open, false)
  return [{ ...own, open }, [{ type: 'preventDefault' }, { id, type: 'change', value: false }]]
}

/**
 * A modal dialog around a widget
 * @template {AnyWidget} W
 * @param {W} content - The widget inside
 * @param {Ref['part']} initialFocus - The part focused when it opens, from the dialog (`['content', ...]` is inside
 *   the content)
 * @returns {import('./compose.js').Composite<DialogProps<PropsOf<W>>, DialogOwn<PropsOf<W>>, DialogInput<PropsOf<W>>, DialogEffect, Readonly<{ content: W }>>}
 *   The dialog
 */
function dialog(content, initialFocus) {
  /** @type {readonly DialogEffect[]} */
  const focus = [{ item: null, part: initialFocus, type: 'focus' }]
  /**
   * The dialog's first own state, focusing inside if it starts open
   * @param {DialogProps<PropsOf<W>>} props - Its props
   * @returns {Result<DialogOwn<PropsOf<W>>, DialogEffect>} The state, and its effects
   */
  const init = (props) => [
    { closeLabel: props.closeLabel, content: props.content, open: pending(true, props.open), title: props.title },
    props.open ? focus : NONE,
  ]
  /** @type {import('./compose.js').CompositeSpec<DialogProps<PropsOf<W>>, DialogOwn<PropsOf<W>>, DialogInput<PropsOf<W>>, DialogEffect, Readonly<{ content: W }>>} */
  const spec = {
    bubble: {
      content: {
        keydown: (own, input, defaultPrevented) =>
          input.key === 'Escape' && !defaultPrevented ? close(own) : [own, NONE],
      },
    },
    children: { content },
    init,
    props: { content: (own) => own.content },
    step: (own, /** @type {DialogInput<PropsOf<W>>} */ input) => {
      switch (input.type) {
        case 'props': {
          const { closeLabel, open, title } = input.props
          const next = { ...own, closeLabel, content: input.props.content, open: fromApp(own.open, true, open), title }
          return [next, shown(next.open) && !shown(own.open) ? focus : NONE]
        }
        case 'refused': {
          const next = { ...own, open: refuse(own.open, input.id) }
          return [next, shown(next.open) && !shown(own.open) ? focus : NONE]
        }
        case 'click': {
          return input.part === 'close' ? close(own) : [own, NONE]
        }
        case 'keydown': {
          return input.key === 'Escape' ? close(own) : [own, NONE]
        }
        default: {
          return [own, NONE]
        }
      }
    },
    view: (own) => ({
      close: part({ content: [{ text: own.closeLabel }], listens: ['click', 'keydown'], role: 'button', tabindex: 0 }),
      root: part({
        aria: { labelledby: ref(['title'], null), modal: true },
        content: [{ part: 'title' }, { child: 'content' }, { part: 'close' }],
        hidden: !shown(own.open),
        listens: ['keydown'],
        role: 'dialog',
        tabindex: -1,
      }),
      title: part({ aria: { level: 2 }, content: [{ text: own.title }], role: 'heading' }),
    }),
  }
  return compose(spec)
}

export { dialog }
