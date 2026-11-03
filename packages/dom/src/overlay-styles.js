import { css } from './css.js'

/**
 * The structural styles every anchored overlay needs, for a view to join with its own (`joinStyles`): an overlay placed
 * against an anchor sits where `syncOverlay` put it, no bigger than the room it has there, scrolling what doesn't fit.
 * An overlay without an anchor keeps the browser's placement (a modal dialog in the middle of the screen).
 */
const overlayStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where([data-anchored]) {
      position: fixed;
      inset: auto;
      inset-inline-start: auto;
      left: var(--interact-overlay-x);
      top: var(--interact-overlay-y);
      margin: 0;
      box-sizing: border-box;
      max-width: var(--interact-overlay-available-width);
      max-height: var(--interact-overlay-available-height);
      overflow: auto;
    }
  }
`

export { overlayStyles }
