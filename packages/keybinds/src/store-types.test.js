import { describe, expect, test } from 'bun:test'

const ROOT = new URL('../../../', import.meta.url).pathname
const PROJECT = 'packages/keybinds/type-errors/tsconfig.json'

/**
 * Where tsgo reports errors in the type-errors project, and their codes
 * @returns {Promise<string[]>} Each error as "file(line,column): code"
 */
async function typeErrors() {
  const run = Bun.spawn([`${ROOT}node_modules/.bin/tsgo`, '-p', PROJECT], { cwd: ROOT, stdout: 'pipe' })
  const output = await new Response(run.stdout).text()
  await run.exited
  return [...output.matchAll(/^(?<where>\S+\(\d+,\d+\)): error (?<code>TS\d+)/gmu)].map(
    ({ groups }) => `${groups?.['where'] ?? ''}: ${groups?.['code'] ?? ''}`,
  )
}

describe('a store over a schema', () => {
  test('makes a misspelled id a type error, in get() and in fromBindings() handlers', async () => {
    expect(await typeErrors()).toEqual([
      'packages/keybinds/type-errors/store-ids.js(11,24): TS2345',
      'packages/keybinds/type-errors/store-ids.js(12,43): TS2561',
      'packages/keybinds/type-errors/store-ids.js(13,43): TS2353',
    ])
  })
})
