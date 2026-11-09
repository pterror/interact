/**
 * The release script, on a repo made for each test, with npm stood in for: what it plans, what it commits and tags,
 * what it publishes, and finishing a release whose publishing stopped partway.
 */

import { afterAll, describe, expect, test } from 'bun:test'

import { bump, parseArguments, publishedManifest, release } from '../scripts/release.js'

/**
 * A package in the made repo
 * @typedef {Readonly<{ dir: string, name: string, version: string, dependencies?: Readonly<Record<string, string>>,
 *   private?: boolean }>} Made
 */

/**
 * npm, stood in for: the release's outside over it, and what it was asked
 * @typedef {Readonly<{
 *   outside: import('../scripts/release.js').Outside,
 *   lines: () => readonly string[],
 *   publishes: () => readonly Readonly<{ name: string, otp: string, manifest: string }>[],
 *   asked: () => number,
 *   failing: (name: string | undefined) => void,
 *   clear: () => void,
 * }>} StandIn
 */

/** @type {string[]} */
const made = []

afterAll(async () => {
  await Promise.all(made.map(async (root) => Bun.$`rm -rf ${root}`.quiet()))
})

/**
 * Runs git in a repo
 * @param {string} root - The repo
 * @param {readonly string[]} args - Its arguments
 * @returns {Promise<string>} What it printed
 */
async function git(root, args) {
  const ran = await Bun.$`git -C ${root} ${args}`.quiet()
  return ran.text().trim()
}

/**
 * A repo with packages, committed, and the given releases tagged
 * @param {readonly Made[]} packages - Its packages
 * @param {readonly string[]} tags - The releases, as `dir@version`
 * @returns {Promise<string>} The repo
 */
async function repo(packages, tags) {
  const temporary = await Bun.$`mktemp -d`.quiet()
  const root = temporary.text().trim()
  made.push(root)
  await Promise.all(
    packages.flatMap(({ dependencies, dir, name, private: isPrivate, version }) => [
      Bun.write(
        `${root}/packages/${dir}/package.json`,
        `${JSON.stringify({ dependencies, name, private: isPrivate, version }, undefined, 2)}\n`,
      ),
      Bun.write(`${root}/packages/${dir}/src/index.js`, `export const name = '${dir}'\n`),
      Bun.write(`${root}/packages/${dir}/src/index.test.js`, 'export {}\n'),
    ]),
  )
  await git(root, ['init', '-q'])
  await git(root, ['config', 'user.email', 'test@example.com'])
  await git(root, ['config', 'user.name', 'Test'])
  await git(root, ['add', '.'])
  await git(root, ['commit', '-q', '-m', 'start'])
  await Promise.all(tags.map(async (tag) => git(root, ['tag', '-a', tag, '-m', tag])))
  return root
}

/**
 * Changes a file and commits it
 * @param {string} root - The repo
 * @param {string} path - The file, in the repo
 * @param {string} text - Its text
 * @returns {Promise<void>} When committed
 */
async function commit(root, path, text) {
  await Bun.write(`${root}/${path}`, text)
  await git(root, ['add', '.'])
  await git(root, ['commit', '-q', '-m', `change ${path}`])
}

/**
 * npm, stood in for
 * @param {readonly string[]} initial - What it has, as `name@version`
 * @returns {StandIn} It
 */
function standIn(initial) {
  const published = new Set(initial)
  /** @type {Readonly<{ name: string, otp: string, manifest: string }>[]} */
  const publishes = []
  /** @type {string[]} */
  const lines = []
  /** @type {string | undefined} */
  let failing = undefined
  let asked = 0
  return {
    asked: () => asked,
    clear() {
      lines.length = 0
    },
    failing(name) {
      failing = name
    },
    lines: () => lines,
    outside: {
      askOtp() {
        asked += 1
        return Promise.resolve(`otp${String(asked)}`)
      },
      log(line) {
        lines.push(line)
      },
      async publish(dir, otp) {
        const manifest = await Bun.file(`${dir}/package.json`).text()
        const name = /"name": "(?<name>[^"]*)"/u.exec(manifest)?.groups?.['name'] ?? ''
        const version = /"version": "(?<version>[^"]*)"/u.exec(manifest)?.groups?.['version'] ?? ''
        if (failing === name) {
          throw new Error('E403 one-time password expired')
        }
        publishes.push({ manifest, name, otp })
        published.add(`${name}@${version}`)
      },
      published(name, version) {
        return Promise.resolve(published.has(`${name}@${version}`))
      },
      async shipped(dir) {
        const files = await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: dir }))
        return files.filter((file) => !file.endsWith('.test.js'))
      },
    },
    publishes: () => publishes,
  }
}

/**
 * What a release that should fail failed with
 * @param {Promise<boolean>} running - The release
 * @returns {Promise<string>} Its error's message, or none if it went through
 */
async function failureOf(running) {
  return running.then(
    () => '',
    (error) => (error instanceof Error ? error.message : String(error)),
  )
}

const A = { dir: 'a', name: '@x/a', version: '0.1.0' }
const B = { dependencies: { '@x/a': 'workspace:^' }, dir: 'b', name: '@x/b', version: '0.1.0' }
const P = { dir: 'p', name: '@x/p', private: true, version: '0.0.0' }

/**
 * A repo where a, released at 0.1.0 and on npm, changed with a minor change recorded; b, depending on a, was never
 * released; p is private
 * @returns {Promise<string>} The repo
 */
async function changedRepo() {
  const root = await repo([A, B, P], ['a@0.1.0'])
  await commit(root, 'packages/a/src/index.js', "export const name = 'a, changed'\n")
  await commit(root, '.changes/render-drop.md', '---\na: minor\n---\n\nrender tells what made an element.\n')
  return root
}

describe('release', () => {
  test('moves a version by the level a change records', () => {
    expect([bump('0.1.9', 'patch'), bump('0.1.9', 'minor'), bump('0.9.3', 'major')]).toEqual([
      '0.1.10',
      '0.2.0',
      '1.0.0',
    ])
  })

  test('publishes a workspace range as the range on the released version', () => {
    const text = '{ "dependencies": { "@x/a": "workspace:^", "@x/c": "workspace:*", "@x/d": "workspace:~" } }'
    const versions = new Map([
      ['@x/a', '0.2.0'],
      ['@x/c', '1.0.0'],
      ['@x/d', '2.1.0'],
    ])
    expect(publishedManifest(text, versions)).toBe(
      '{ "dependencies": { "@x/a": "^0.2.0", "@x/c": "1.0.0", "@x/d": "~2.1.0" } }',
    )
  })

  test('in a dry run, says what it would release and changes nothing', async () => {
    const root = await changedRepo()
    const head = await git(root, ['rev-parse', 'HEAD'])
    const npm = standIn(['@x/a@0.1.0'])
    expect(await release({ dryRun: true, outside: npm.outside, root })).toBe(true)
    expect(npm.lines()).toEqual([
      'a: 0.1.0 -> 0.2.0 (minor, recorded in .changes/)',
      'b: 0.1.0 -> 0.1.0 (first release)',
      'would commit: release: a@0.2.0, b@0.1.0',
      '  would delete .changes/render-drop.md',
      'would tag: a@0.2.0 b@0.1.0',
      'would publish @x/a@0.2.0',
      'would publish @x/b@0.1.0',
    ])
    expect([await git(root, ['rev-parse', 'HEAD']), await git(root, ['status', '--porcelain'])]).toEqual([head, ''])
    expect(await git(root, ['tag'])).toBe('a@0.1.0')
    expect([npm.asked(), npm.publishes()]).toEqual([0, []])
  })

  test('commits, tags and publishes, asking for the password once, with ranges on the released versions', async () => {
    const root = await changedRepo()
    const npm = standIn(['@x/a@0.1.0'])
    expect(await release({ dryRun: false, outside: npm.outside, root })).toBe(true)
    expect(await git(root, ['log', '-1', '--format=%s%n%n%b'])).toBe(
      'release: a@0.2.0, b@0.1.0\n\n- render tells what made an element.',
    )
    const tags = await git(root, ['tag'])
    expect(tags.split('\n')).toEqual(['a@0.1.0', 'a@0.2.0', 'b@0.1.0'])
    expect(await git(root, ['status', '--porcelain'])).toBe('')
    expect(await Bun.file(`${root}/.changes/render-drop.md`).exists()).toBe(false)
    expect(npm.asked()).toBe(1)
    expect(npm.publishes().map(({ name, otp }) => `${name} ${otp}`)).toEqual(['@x/a otp1', '@x/b otp1'])
    expect(npm.publishes()[1]?.manifest).toContain('"@x/a": "^0.2.0"')
    expect(await Bun.file(`${root}/packages/b/package.json`).text()).toContain('"@x/a": "workspace:^"')
  })

  test('after a publish fails partway, a rerun publishes the rest without moving any version', async () => {
    const root = await changedRepo()
    const npm = standIn(['@x/a@0.1.0'])
    npm.failing('@x/b')
    expect(await release({ dryRun: false, outside: npm.outside, root })).toBe(false)
    expect(npm.lines().slice(-2)).toEqual([
      'publishing @x/b@0.1.0 failed: E403 one-time password expired',
      'run the release again to publish what is left',
    ])
    const head = await git(root, ['rev-parse', 'HEAD'])
    expect(await git(root, ['status', '--porcelain'])).toBe('')
    npm.failing(undefined)
    npm.clear()
    expect(await release({ dryRun: true, outside: npm.outside, root })).toBe(true)
    expect(npm.lines()).toEqual(["finishing a release npm doesn't have all of: b@0.1.0", 'would publish @x/b@0.1.0'])
    npm.clear()
    expect(await release({ dryRun: false, outside: npm.outside, root })).toBe(true)
    expect(npm.publishes().map(({ name }) => name)).toEqual(['@x/a', '@x/b'])
    expect(npm.asked()).toBe(2)
    expect(await git(root, ['rev-parse', 'HEAD'])).toBe(head)
    const tags = await git(root, ['tag'])
    expect(tags.split('\n')).toEqual(['a@0.1.0', 'a@0.2.0', 'b@0.1.0'])
    npm.clear()
    expect(await release({ dryRun: false, outside: npm.outside, root })).toBe(true)
    expect(npm.lines()).toEqual(['nothing to release'])
  })

  test('moves a package a patch when a package it depends on is released', async () => {
    const root = await repo([A, B], ['a@0.1.0', 'b@0.1.0'])
    await commit(root, 'packages/a/src/index.js', "export const name = 'a, fixed'\n")
    await commit(root, '.changes/fix.md', '---\na: patch\n---\n\nA fix.\n')
    const npm = standIn(['@x/a@0.1.0', '@x/b@0.1.0'])
    expect(await release({ dryRun: true, outside: npm.outside, root })).toBe(true)
    expect(npm.lines().slice(0, 2)).toEqual([
      'a: 0.1.0 -> 0.1.1 (patch, recorded in .changes/)',
      'b: 0.1.0 -> 0.1.1 (patch, as a is released and the range it is published with moves)',
    ])
  })

  test('refuses a package that changed with no recorded change, or whose version changed outside a release', async () => {
    const root = await repo([A], ['a@0.1.0'])
    const npm = standIn(['@x/a@0.1.0'])
    await commit(root, 'packages/a/src/index.test.js', 'export const tested = true\n')
    expect(await release({ dryRun: true, outside: npm.outside, root })).toBe(true)
    expect(npm.lines()).toEqual(['nothing to release'])
    await commit(root, 'packages/a/src/index.js', "export const name = 'a, changed'\n")
    expect(await failureOf(release({ dryRun: true, outside: npm.outside, root }))).toContain(
      'a changed since a@0.1.0, and no .changes/ file names it',
    )
    await commit(root, 'packages/a/package.json', `${JSON.stringify({ ...A, version: '0.3.0' })}\n`)
    expect(await failureOf(release({ dryRun: true, outside: npm.outside, root }))).toContain(
      'a says 0.3.0 but its last release is 0.1.0: a version changes only in a release',
    )
  })

  test('refuses to release from a working tree with changes', async () => {
    const root = await changedRepo()
    await Bun.write(`${root}/packages/a/src/index.js`, 'export {}\n')
    expect(await failureOf(release({ dryRun: false, outside: standIn([]).outside, root }))).toContain(
      'The working tree has changes',
    )
  })
})

describe('the command line', () => {
  test('runs a release only when asked for nothing else, or a dry run', () => {
    expect(parseArguments([])).toEqual({ run: 'release' })
    expect(parseArguments(['--dry-run'])).toEqual({ run: 'dry-run' })
  })

  test('prints the usage for --help, whatever else is given', () => {
    expect(parseArguments(['--help'])).toEqual({ refused: undefined, run: 'usage' })
    expect(parseArguments(['--dry-run', '--help'])).toEqual({ refused: undefined, run: 'usage' })
  })

  test('refuses an argument it does not know, naming it, with the usage', () => {
    expect(parseArguments(['-h'])).toEqual({ refused: 'Unknown argument: -h', run: 'usage' })
    expect(parseArguments(['--dry-run', 'list'])).toEqual({ refused: 'Unknown argument: list', run: 'usage' })
  })
})
