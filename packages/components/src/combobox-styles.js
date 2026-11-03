import { css, joinStyles, overlayStyles } from '@interact/dom'

import { rowsStyles } from './rows-styles.js'

/**
 * The combobox's own structural stylesheet, the same in shadow and light DOM. Every visual value is a token: an
 * instance's own, else the component's (`--interact-combobox-*`), else the theme's global one, else a system color.
 * The popup is at least as wide as the field, and no taller than its options.
 */
const comboboxOwnStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where(:scope) {
      --_row-height: var(--interact-combobox-row-height, var(--interact-size-row, 2rem));
      --_fill: var(--interact-combobox-fill, var(--interact-color-surface, Canvas));
      --_color: var(--interact-combobox-color, var(--interact-color-on-surface, CanvasText));
      --_border: var(--interact-combobox-border, var(--interact-color-border, GrayText));
      --_focus: var(--interact-combobox-focus, var(--interact-color-focus, Highlight));
      --_secondary-opacity: var(--interact-combobox-secondary-opacity, 0.75);
      --_active-fill: var(
        --interact-combobox-option-active-fill,
        var(--interact-color-brand-fill-loud, color-mix(in srgb, Highlight 25%, Canvas))
      );
      --_active-color: var(--interact-combobox-option-active-color, var(--interact-color-brand-on-loud, CanvasText));
      --_padding: var(--interact-combobox-padding, var(--interact-space-inline, 0.75em));
      --_width: var(--interact-combobox-width, 12em);

      display: inline-block;
    }

    :where([part~='field']) {
      box-sizing: border-box;
      display: block;
      min-inline-size: var(--_width);
      min-block-size: var(--_row-height);
      padding: 0 var(--_padding);
      border: 1px solid var(--_border);
      background: var(--_fill);
      color: var(--_color);
      font: inherit;
      line-height: calc(var(--_row-height) - 2px);
      cursor: default;
      user-select: none;
    }

    :where(input[part~='field']) {
      cursor: text;
      user-select: auto;
    }

    :where([part~='field']:focus-visible) {
      outline: 2px solid var(--_focus);
      outline-offset: -2px;
    }

    :where([part~='placeholder']) {
      opacity: var(--_secondary-opacity);
    }

    :where([part~='popup']) {
      min-inline-size: var(--_field-width, var(--_width));
      padding: 0;
      border: 1px solid var(--_border);
      background: var(--_fill);
      color: var(--_color);
    }

    :where([part~='list'] > [part~='viewport']) {
      block-size: calc(min(var(--interact-visible-rows), var(--_options)) * var(--_row-height));
    }

    :where([part~='option']) {
      padding-inline: var(--_padding);
    }

    :where([part~='option-active']) {
      background: var(--_active-fill);
      color: var(--_active-color);
    }

    :where([part~='option-chosen']) {
      font-weight: bold;
    }

    @media (forced-colors: active) {
      :where([part~='option-active']) {
        forced-color-adjust: none;
        background: Highlight;
        color: HighlightText;
      }
    }
  }
`

/** The combobox's stylesheet: an overlay's, the rows' structure, then its own. */
const comboboxStyles = joinStyles(overlayStyles, rowsStyles, comboboxOwnStyles)

export { comboboxStyles }
