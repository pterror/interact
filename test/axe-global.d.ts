import type axeCore from 'axe-core'

declare global {
  /** The axe-core library, as its script defines it in a test page. */
  const axe: typeof axeCore
}
