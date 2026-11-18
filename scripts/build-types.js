/**
 * Builds the type declarations of every package whose manifest names `types`, from its JSDoc, into its `dist`, with
 * the declarations its sources hold that no module has (global ones, other packages' augmented). Tests and test
 * helpers get none. With `--check`, builds them aside and fails if any `dist` differs from what it builds.
 */

const ROOT = new URL('..', import.meta.url).pathname
const TEST_ONLY = /(?:\.test|(?:^|\/)test-[^/]*)\.d\.ts$/u

/**
 * Whether a package's manifest names its types
 * @param {string} file - Its package.json, from the repo root
 * @returns {Promise<boolean>} Whether it has a `types` field
 */
async function shipsTypes(file) {
  /** @type {unknown} */
  const manifest = await Bun.file(`${ROOT}${file}`).json()
  return typeof manifest === 'object' && manifest !== null && 'types' in manifest
}

/**
 * The packages that ship types
 * @returns {Promise<string[]>} Their directories, from the repo root, with a trailing slash
 */
async function typedPackages() {
  const files = await Array.fromAsync(new Bun.Glob('packages/*/package.json').scan({ cwd: ROOT }))
  const typed = await Promise.all(files.map(async (file) => shipsTypes(file)))
  return files.filter((_, index) => typed[index] === true).map((file) => file.replace(/package\.json$/u, ''))
}

/**
 * The files under a directory, as paths in it
 * @param {string} dir - The directory, absolute
 * @returns {Promise<string[]>} Their paths
 */
async function filesIn(dir) {
  const listed = await Bun.$`test -d ${dir}`.nothrow().quiet()
  if (listed.exitCode !== 0) {
    return []
  }
  return Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: dir }))
}

/**
 * Builds one package's declarations
 * @param {string} dir - The package, from the repo root
 * @param {string} out - Where they go, absolute
 * @returns {Promise<void>} When they are built
 */
async function build(dir, out) {
  await Bun.$`rm -rf ${out}`
  const config = `${ROOT}${dir}tsconfig.build.json`
  const tsconfig = (await Bun.file(config).exists()) ? config : `${ROOT}${dir}tsconfig.json`
  const built = Bun.spawn(
    [
      `${ROOT}node_modules/.bin/tsgo`,
      '-p',
      tsconfig,
      '--noEmit',
      'false',
      '--declaration',
      '--emitDeclarationOnly',
      '--outDir',
      out,
      '--rootDir',
      `${ROOT}${dir}src`,
    ],
    { stderr: 'inherit', stdout: 'inherit' },
  )
  const code = await built.exited
  if (code !== 0) {
    throw new Error(`Building the types of ${dir} failed`)
  }
  const files = await filesIn(out)
  const tests = files.filter((file) => TEST_ONLY.test(file))
  await Promise.all(tests.map(async (file) => Bun.file(`${out}/${file}`).delete()))
  const sources = await filesIn(`${ROOT}${dir}src`)
  const declared = sources.filter((file) => file.endsWith('.d.ts') && !TEST_ONLY.test(file) && !files.includes(file))
  await Promise.all(declared.map(async (file) => Bun.write(`${out}/${file}`, Bun.file(`${ROOT}${dir}src/${file}`))))
}

/**
 * The text of a file, or none
 * @param {string} path - The file, absolute
 * @returns {Promise<string | undefined>} Its text
 */
async function textOf(path) {
  const file = Bun.file(path)
  const exists = await file.exists()
  return exists ? file.text() : undefined
}

/**
 * The files two directories don't hold alike
 * @param {string} one - A directory, absolute
 * @param {string} other - Another
 * @returns {Promise<string[]>} Their paths
 */
async function differences(one, other) {
  const [left, right] = await Promise.all([filesIn(one), filesIn(other)])
  const paths = [...new Set([...left, ...right])].toSorted()
  const differ = await Promise.all(
    paths.map(async (path) => {
      const [was, now] = await Promise.all([textOf(`${one}/${path}`), textOf(`${other}/${path}`)])
      return was !== now
    }),
  )
  return paths.filter((_, index) => differ[index] === true)
}

/**
 * Builds one package's declarations aside, then compares them with its `dist` or puts them there. Built aside either
 * way: each package is staged aside before its declarations are replaced
 * @param {string} dir - The package, from the repo root
 * @param {boolean} checking - Whether to compare rather than write
 * @returns {Promise<string[]>} The files in `dist` that are out of date, when comparing
 */
async function buildOrCheck(dir, checking) {
  const dist = `${ROOT}${dir}dist`
  const aside = `${ROOT}${dir}.dist-check`
  await build(dir, aside)
  if (!checking) {
    builtAside.push([aside, dist])
    return []
  }
  const stale = await differences(dist, aside)
  await Bun.$`rm -rf ${aside}`
  return stale.map((path) => `${dir}dist/${path}`)
}

const checking = Bun.argv.includes('--check')
const packages = await typedPackages()
/** @type {[string, string][]} */
const builtAside = []
/**
 * The workspace dependencies whose declarations a package consumes
 * @param {string} dir - The package directory
 * @returns {Promise<Readonly<{ dir: string, name: string, dependencies: readonly string[] }>>} Its name and dependencies
 */
async function dependencyInfo(dir) {
  /** @type {unknown} */
  const manifest = await Bun.file(`${ROOT}${dir}package.json`).json()
  if (typeof manifest !== 'object' || manifest === null || !('name' in manifest) || typeof manifest.name !== 'string') {
    throw new Error(`No package name in ${dir}package.json`)
  }
  /** @type {string[]} */
  const dependencies = []
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies']) {
    /** @type {unknown} */
    const value = Reflect.get(manifest, field)
    if (typeof value === 'object' && value !== null) {
      dependencies.push(...Object.keys(value))
    }
  }
  return { dir, name: manifest.name, dependencies }
}
const manifests = await Promise.all(packages.map(async (dir) => dependencyInfo(dir)))
/** @type {Map<string, Readonly<{ dir: string, dependencies: readonly string[] }>>} */
const pending = new Map()
for (const { dir, name, dependencies } of manifests) {
  pending.set(name, { dir, dependencies })
}
/** @type {string[][]} */
const results = []
while (pending.size > 0) {
  /** @type {(readonly [string, Readonly<{ dir: string, dependencies: readonly string[] }>])[]} */
  const ready = []
  for (const [name, info] of pending) {
    if (!info.dependencies.some((dependency) => pending.has(dependency))) {
      ready.push([name, info])
    }
  }
  if (ready.length === 0) {
    throw new Error('The typed packages have a dependency cycle')
  }
  // oxlint-disable-next-line no-await-in-loop -- a dependency's declarations must exist before its consumers build
  results.push(...(await Promise.all(ready.map(async ([, { dir }]) => buildOrCheck(dir, checking)))))
  for (const [aside, dist] of builtAside.splice(0)) {
    // oxlint-disable-next-line no-await-in-loop -- replace a completed dependency before building its consumers
    await Bun.$`rm -rf ${dist} && mv ${aside} ${dist}`
  }
  for (const [name] of ready) {
    pending.delete(name)
  }
}
const stale = results.flat()
if (stale.length > 0) {
  console.error(`Out of date (run bun run build:types):\n${stale.join('\n')}`)
  process.exitCode = 1
}
