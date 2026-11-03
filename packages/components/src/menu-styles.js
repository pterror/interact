import { css, joinStyles, overlayStyles } from '@interact/dom'

import { rowsStyles } from './rows-styles.js'

/**
 * The menu's own structural stylesheet, the same in shadow and light DOM and for a menu button and a context menu.
 * Every visual value is a token: an instance's own, else the component's (`--interact-menu-*`), else the theme's
 * global one, else a system color. Rows are virtualized, so they don't size the menu: it is `--interact-menu-width`
 * wide, at least.
 */
const menuOwnStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where(:scope) {
      --_row-height: var(--interact-menu-row-height, var(--interact-size-row, 2rem));
      --_fill: var(--interact-menu-fill, var(--interact-color-surface, Canvas));
      --_color: var(--interact-menu-color, var(--interact-color-on-surface, CanvasText));
      --_border: var(--interact-menu-border, var(--interact-color-border, GrayText));
      --_focus: var(--interact-menu-focus, var(--interact-color-focus, Highlight));
      --_active-fill: var(
        --interact-menu-item-active-fill,
        var(--interact-color-brand-fill-loud, color-mix(in srgb, Highlight 25%, Canvas))
      );
      --_active-color: var(--interact-menu-item-active-color, var(--interact-color-brand-on-loud, CanvasText));
      --_disabled-color: var(--interact-menu-item-disabled-color, var(--interact-color-on-surface-quiet, GrayText));
      --_padding: var(--interact-menu-item-padding, var(--interact-space-inline, 0.75em));
      --_width: var(--interact-menu-width, 12em);

      display: inline-block;
    }

    :where([part~='overlay']) {
      box-sizing: border-box;
      min-inline-size: var(--_width);
      padding: 0;
      border: 1px solid var(--_border);
      background: var(--_fill);
      color: var(--_color);
    }

    :where([part~='viewport']) {
      inline-size: 100%;
    }

    :where([part~='item']) {
      display: flex;
      gap: 1em;
      align-items: center;
      padding-inline: var(--_padding);
    }

    :where([part~='item-active']) {
      background: var(--_active-fill);
      color: var(--_active-color);
    }

    :where([part~='viewport']:focus-visible [part~='item-active']) {
      outline: 2px solid var(--_focus);
      outline-offset: -2px;
    }

    :where([part~='item-disabled']) {
      color: var(--_disabled-color);
    }

    :where([part~='check']) {
      inline-size: 1em;
      text-align: center;
    }

    :where([part~='label']) {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :where([part~='shortcut']) {
      opacity: 0.75;
    }

    :where([part~='separator']) {
      display: flex;
      align-items: center;
      padding-inline: var(--_padding);
    }

    :where([part~='separator'])::before {
      content: '';
      flex: 1;
      border-block-start: 1px solid var(--_border);
    }

    @media (forced-colors: active) {
      :where([part~='item-active']) {
        forced-color-adjust: none;
        background: Highlight;
        color: HighlightText;
      }
    }
  }
`

/** The menu's stylesheet: an overlay's, the rows' structure, then its own. */
const menuStyles = joinStyles(overlayStyles, rowsStyles, menuOwnStyles)

export { menuStyles }
