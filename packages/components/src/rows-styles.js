import { css } from '@interact/dom'

/**
 * The structure every virtualized list's viewport needs, whatever its rows are (a listbox's options, a menu's items):
 * it shows `--interact-visible-rows` rows, its spacer holds the scrollable rows, and each row sits in its own. A
 * component sets `--_row-height` on its host from its own tokens, and joins this with its own stylesheet.
 */
const rowsStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where([part~='viewport']) {
      --_pitch: var(--interact-pitch, var(--_row-height));

      position: relative;
      box-sizing: content-box;
      block-size: calc(var(--interact-visible-rows) * var(--_row-height));
      overflow-y: auto;
      overflow-anchor: none;
      overscroll-behavior: contain;
      outline: none;
    }

    :where([part~='spacer']) {
      position: relative;
      block-size: calc(var(--interact-virtual-rows) * var(--_pitch));
      overflow: clip;
    }

    :where([part~='row']) {
      position: absolute;
      inset-block-start: calc(var(--interact-row) * var(--_pitch));
      inset-inline: 0;
      box-sizing: border-box;
      block-size: var(--_row-height);
      overflow: hidden;
      line-height: var(--_row-height);
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: default;
      user-select: none;
    }

    :where([part~='row'][data-offscreen]) {
      clip-path: inset(50%);
    }
  }
`

export { rowsStyles }
