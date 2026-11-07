import { css, joinStyles, overlayStyles } from '@interact/dom'

import { windowingStyles } from './windowing-styles.js'

/**
 * The command palette's own structural stylesheet, the same in shadow and light DOM. Every visual value is a token: an
 * instance's own, else the component's (`--interact-palette-*`), else the theme's global one, else a system color. The
 * dialog is `--interact-palette-width` wide; the status region lies over the results, where they would be.
 */
const paletteOwnStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where(:scope) {
      --_row-height: var(--interact-palette-row-height, var(--interact-size-row, 2rem));
      --_fill: var(--interact-palette-fill, var(--interact-color-surface, Canvas));
      --_color: var(--interact-palette-color, var(--interact-color-on-surface, CanvasText));
      --_border: var(--interact-palette-border, var(--interact-color-border, GrayText));
      --_focus: var(--interact-palette-focus, var(--interact-color-focus, Highlight));
      --_quiet: var(--interact-palette-disabled-color, var(--interact-color-on-surface-quiet, GrayText));
      --_secondary-opacity: var(--interact-palette-secondary-opacity, 0.75);
      --_active-fill: var(
        --interact-palette-result-active-fill,
        var(--interact-color-brand-fill-loud, color-mix(in srgb, Highlight 25%, Canvas))
      );
      --_active-color: var(--interact-palette-result-active-color, var(--interact-color-brand-on-loud, CanvasText));
      --_match-color: var(--interact-palette-match-color, inherit);
      --_padding: var(--interact-palette-padding, var(--interact-space-inline, 0.75em));
      --_width: var(--interact-palette-width, 36em);
      --_from-top: var(--interact-palette-from-top, 12vh);

      display: contents;
    }

    :where([part~='dialog']) {
      box-sizing: border-box;
      inline-size: min(var(--_width), calc(100vw - 2em));
      margin-block: var(--_from-top) auto;
      padding: 0;
      border: 1px solid var(--_border);
      background: var(--_fill);
      color: var(--_color);
    }

    :where([part~='search']) {
      box-sizing: border-box;
      inline-size: 100%;
      padding: 0.5em var(--_padding);
      border: 0;
      border-block-end: 1px solid var(--_border);
      background: transparent;
      color: inherit;
      font: inherit;
    }

    :where([part~='search']:focus-visible) {
      outline: 2px solid var(--_focus);
      outline-offset: -2px;
    }

    :where([part~='results']) {
      display: grid;
    }

    :where([part~='results'] > *) {
      grid-area: 1 / 1;
    }

    :where([part~='status']) {
      align-self: start;
      padding-inline: var(--_padding);
      line-height: var(--_row-height);
      opacity: var(--_secondary-opacity);
      pointer-events: none;
    }

    :where([part~='viewport']) {
      outline: none;
    }

    :where([part~='row']) {
      box-sizing: border-box;
      block-size: var(--_row-height);
      overflow: hidden;
      line-height: var(--_row-height);
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: default;
      user-select: none;
    }

    :where([part~='result']) {
      display: flex;
      gap: 1em;
      align-items: center;
      padding-inline: var(--_padding);
    }

    :where([part~='result-active']) {
      background: var(--_active-fill);
      color: var(--_active-color);
    }

    :where([part~='result-disabled']) {
      color: var(--_quiet);
    }

    :where([part~='result-disabled'] *) {
      opacity: 1;
    }

    :where([part~='label']) {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :where([part~='match']) {
      background: none;
      color: var(--_match-color);
      font-weight: bold;
    }

    :where([part~='description'], [part~='category'], [part~='shortcut']) {
      opacity: var(--_secondary-opacity);
    }

    :where([part~='description']:empty, [part~='category']:empty, [part~='shortcut']:empty) {
      display: none;
    }

    @media (forced-colors: active) {
      :where([part~='result-active']) {
        forced-color-adjust: none;
        background: Highlight;
        color: HighlightText;
      }
    }
  }
`

/** The palette's stylesheet: an overlay's, a windowed list's structure, then its own. */
const paletteStyles = joinStyles(overlayStyles, windowingStyles, paletteOwnStyles)

export { paletteStyles }
