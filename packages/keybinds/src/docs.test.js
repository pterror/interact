/**
 * The reference docs against the package: every function a heading names is exported, and every type a signature
 * names is one the package declares, one the docs declare, or the platform's or TypeScript's own.
 */

import { describe, expect, test } from 'bun:test'

const keybinds = await import('./index.js')
const PACKAGE = new URL('..', import.meta.url).pathname
const REFERENCE = ['docs/reference/index.md', 'docs/reference/ui.md']
const TYPESCRIPT_OWN = new Set(['Omit', 'Partial', 'Pick', 'Readonly', 'ReadonlyMap', 'Record', 'Window'])
const TYPE_PARAMETER = /^[A-Z]$/u

/**
 * Every type the package's declarations name
 * @returns {Promise<Set<string>>} Their names
 */
async function declaredTypes() {
  const files = await Array.fromAsync(new Bun.Glob('*.d.ts').scan({ cwd: `${PACKAGE}dist` }))
  const texts = await Promise.all(files.map(async (file) => Bun.file(`${PACKAGE}dist/${file}`).text()))
  return new Set(
    texts.flatMap((text) =>
      [...text.matchAll(/(?:export type|declare class|interface)\s+(?<name>\w+)/gu)].map(
        (match) => match.groups?.['name'] ?? '',
      ),
    ),
  )
}

/**
 * What the reference names that the package doesn't have
 * @returns {Promise<string[]>} Each as "file: what"
 */
async function unknownNames() {
  const [types, texts] = await Promise.all([
    declaredTypes(),
    Promise.all(REFERENCE.map(async (file) => Bun.file(`${PACKAGE}${file}`).text())),
  ])
  return REFERENCE.flatMap((file, index) => {
    const text = texts[index] ?? ''
    const local = new Set(
      [...text.matchAll(/(?:interface|type)\s+(?<name>\w+)/gu)].map((match) => match.groups?.['name']),
    )
    const functions = [...text.matchAll(/^## (?<heading>.*)$/gmu)].flatMap((heading) =>
      [...(heading.groups?.['heading'] ?? '').matchAll(/(?<name>\w+)\(/gu)].map((call) => call.groups?.['name'] ?? ''),
    )
    const signatures = [...text.matchAll(/```ts\n(?<code>[\s\S]*?)```/gu)].flatMap((block) =>
      [...(block.groups?.['code'] ?? '').matchAll(/[:<|]\s*(?<name>[A-Z]\w*)/gu)].map(
        (use) => use.groups?.['name'] ?? '',
      ),
    )
    return [
      ...functions.filter((name) => !(name in keybinds)).map((name) => `${file}: function ${name}`),
      ...signatures
        .filter(
          (name) =>
            !types.has(name) &&
            !local.has(name) &&
            !TYPESCRIPT_OWN.has(name) &&
            !TYPE_PARAMETER.test(name) &&
            !(name in globalThis),
        )
        .map((name) => `${file}: type ${name}`),
    ]
  })
}

describe('the reference docs', () => {
  test('name only functions the package exports and types it declares', async () => {
    expect([...new Set(await unknownNames())]).toEqual([])
  })
})
