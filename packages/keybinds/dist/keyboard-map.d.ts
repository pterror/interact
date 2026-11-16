/** The Keyboard Map API: what each physical key types on the person's layout, where a browser can tell. */
interface Keyboard {
  readonly getLayoutMap: () => Promise<ReadonlyMap<string, string>>
}

declare global {
  interface Navigator {
    /** The keyboard, in browsers that have the Keyboard Map API (Chromium). */
    readonly keyboard?: Keyboard
  }
}

export type { Keyboard }
