import { css } from '@interact/dom'

/**
 * The structure a windowed list needs, whatever its rows are: the list shows `--interact-visible-rows` rows and
 * scrolls; each row and gap sits in its scrollable row (`--interact-row`), a gap as tall as the scrollable rows it
 * stands for, so the gaps make the list as tall as all its scrollable rows; a row kept outside the window (the active
 * item) is there but can't be seen. Rows have one height, which a component sets as `--_row-height` on its host from
 * its own tokens; it joins this with its own stylesheet.
 */
const windowingStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where([data-windowed]) {
      --_pitch: var(--interact-pitch, var(--_row-height));

      position: relative;
      box-sizing: content-box;
      block-size: calc(var(--interact-visible-rows) * var(--_row-height));
      overflow-y: auto;
      overflow-anchor: none;
      overscroll-behavior: contain;
    }

    :where([data-windowed] > *) {
      position: absolute;
      inset-block-start: calc(var(--interact-row) * var(--_pitch));
      inset-inline: 0;
    }

    :where([data-windowed] > [part~='gap']) {
      block-size: calc(var(--interact-gap-rows) * var(--_pitch));
    }

    :where([data-windowed] > [data-offscreen]) {
      clip-path: inset(50%);
    }
  }
`

export { windowingStyles }
