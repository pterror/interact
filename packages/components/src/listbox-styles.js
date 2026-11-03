import { css } from '@interact/dom'

/**
 * The listbox's structural stylesheet, the same in shadow and light DOM. Every visual value is a token: an instance's
 * own (set on the element), else the component's (`--interact-listbox-*`), else the theme's global one
 * (`--interact-color-*`, `--interact-size-*`), else a system color, so it works with no theme at all. They are resolved
 * on the element itself, so a token set on one instance applies to that instance.
 */
const listboxStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where(:scope) {
      --_row-height: var(--interact-listbox-row-height, var(--interact-size-row, 2rem));
      --_fill: var(--interact-listbox-fill, var(--interact-color-surface, Canvas));
      --_color: var(--interact-listbox-color, var(--interact-color-on-surface, CanvasText));
      --_border: var(--interact-listbox-border, var(--interact-color-border, GrayText));
      --_focus: var(--interact-listbox-focus, var(--interact-color-focus, Highlight));
      --_option-fill: var(--interact-listbox-option-fill, transparent);
      --_option-color: var(--interact-listbox-option-color, var(--_color));
      --_hover-fill: var(
        --interact-listbox-option-hover-fill,
        var(--interact-color-neutral-fill-quiet, color-mix(in srgb, CanvasText 8%, transparent))
      );
      --_selected-fill: var(--interact-listbox-option-selected-fill, var(--interact-color-brand-fill-loud, Highlight));
      --_selected-color: var(
        --interact-listbox-option-selected-color,
        var(--interact-color-brand-on-loud, HighlightText)
      );
      --_padding: var(--interact-listbox-option-padding, var(--interact-space-inline, 0.75em));

      display: block;
    }

    :where([part~='viewport']) {
      position: relative;
      box-sizing: content-box;
      block-size: calc(var(--interact-listbox-visible-rows) * var(--_row-height));
      overflow-y: auto;
      overflow-anchor: none;
      overscroll-behavior: contain;
      border: 1px solid var(--_border);
      background: var(--_fill);
      color: var(--_color);
      outline: none;
    }

    :where([part~='viewport']:focus-visible) {
      outline: 2px solid var(--_focus);
      outline-offset: 1px;
    }

    :where([part~='spacer']) {
      position: relative;
      block-size: calc(var(--interact-listbox-virtual-rows) * var(--_row-height));
      overflow: clip;
    }

    :where([part~='option']) {
      position: absolute;
      inset-block-start: 0;
      inset-inline: 0;
      box-sizing: border-box;
      block-size: var(--_row-height);
      padding-inline: var(--_padding);
      overflow: hidden;
      line-height: var(--_row-height);
      white-space: nowrap;
      text-overflow: ellipsis;
      background: var(--_option-fill);
      color: var(--_option-color);
      cursor: default;
      user-select: none;
      transform: translateY(calc(var(--interact-listbox-row) * var(--_row-height)));
    }

    :where([part~='option']:hover) {
      background: var(--_hover-fill);
    }

    :where([part~='option-selected']) {
      background: var(--_selected-fill);
      color: var(--_selected-color);
    }

    :where([part~='viewport']:focus-visible [part~='option-active']) {
      outline: 2px solid var(--_focus);
      outline-offset: -2px;
    }

    :where([part~='option'][data-offscreen]) {
      clip-path: inset(50%);
    }
  }
`

export { listboxStyles }
