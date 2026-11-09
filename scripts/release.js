/**
 * Releases the packages that changed since their last release: one command, `bun run release` (`--dry-run` to see
 * what it would do). A release is a tag per package, `<dir>@<version>` (`list@0.2.0`), on one release commit; a
 * package without one has never been released, and its first release carries the version in its manifest.
 *
 * How far a changed package's version moves is recorded with the change, in a file in `.changes/` naming each package
 * it changes and the level: `major`, `minor` or `patch`. The release takes the highest level per package, moves the
 * version once, and deletes the files it used. A package that changed with no file naming it stops the release. A
 * package whose dependency on another of these packages is released moves at least a patch, as the range it is
 * published with moves.
 *
 * In the repo a dependency on another of these packages is `workspace:^` (or `workspace:~`, `workspace:*`), so
 * development uses the package in the repo; each publish writes the released version's range in its place, and puts
 * the manifest back after.
 *
 * Publishing comes after the release commit and its tags: every tagged version npm doesn't have is published, with
 * the one-time password asked for once. So if a publish fails, running it again publishes what is left, without
 * moving any version.
 */

/**
 * A package that is released from this repo
 * @typedef {Readonly<{
 *   dir: string,
 *   name: string,
 *   version: string,
 *   internal: readonly string[],
 * }>} Package
 */

/**
 * How far a version moves
 * @typedef {'major' | 'minor' | 'patch'} Level
 */

/**
 * A recorded change: its file, the level per package dir, and what it says
 * @typedef {Readonly<{ file: string, levels: ReadonlyMap<string, Level>, summary: string }>} Change
 */

/**
 * What the release talks to besides git: npm, the person running it, and its output
 * @typedef {Readonly<{
 *   shipped: (dir: string) => Promise<readonly string[]>,
 *   published: (name: string, version: string) => Promise<boolean>,
 *   publish: (dir: string, otp: string) => Promise<void>,
 *   askOtp: () => Promise<string>,
 *   log: (line: string) => void,
 * }>} Outside
 */

/**
 * One package's part in a release
 * @typedef {Readonly<{ pkg: Package, version: string, why: string }>} Planned
 */

/** @type {readonly Level[]} */
const LEVELS = ['patch', 'minor', 'major']
const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies']
const TEST_FILE = /(?:\.test\.js|(?:^|\/)test-[^/]*\.js|\.test\.d\.ts|(?:^|\/)test-[^/]*\.d\.ts)$/u
const CHANGES = '.changes'

/**
 * Runs git in the repo
 * @param {string} root - The repo
 * @param {readonly string[]} args - Its arguments
 * @returns {Promise<string>} What it printed, trimmed
 */
async function git(root, args) {
  const ran = await Bun.$`git -C ${root} ${args}`.quiet()
  return ran.text().trim()
}

/**
 * The parts of a version
 * @param {string} version - `x.y.z`
 * @returns {[number, number, number]} Its major, minor and patch
 */
function partsOf(version) {
  const match = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/u.exec(version)
  if (match?.groups === undefined) {
    throw new Error(`${version} is not a plain x.y.z version`)
  }
  return [Number(match.groups['major']), Number(match.groups['minor']), Number(match.groups['patch'])]
}

/**
 * Orders two versions
 * @param {string} one - A version
 * @param {string} other - Another
 * @returns {number} Below zero if `one` is lower, above if higher
 */
function compareVersions(one, other) {
  const [a, b] = [partsOf(one), partsOf(other)]
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/**
 * A version moved by a level
 * @param {string} version - The version
 * @param {Level} level - How far
 * @returns {string} The next version
 */
function bump(version, level) {
  const [major, minor, patch] = partsOf(version)
  if (level === 'major') {
    return `${String(major + 1)}.0.0`
  }
  if (level === 'minor') {
    return `${String(major)}.${String(minor + 1)}.0`
  }
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`
}

/**
 * The higher of two levels
 * @param {Level | undefined} one - A level, or none
 * @param {Level} other - Another
 * @returns {Level} The higher
 */
function higher(one, other) {
  return one === undefined || LEVELS.indexOf(other) > LEVELS.indexOf(one) ? other : one
}

/**
 * Whether a value is a level
 * @param {string} value - The value
 * @returns {value is Level} Whether it is one
 */
function isLevel(value) {
  return value === 'major' || value === 'minor' || value === 'patch'
}

/**
 * The names a manifest field lists
 * @param {unknown} field - The field
 * @returns {Map<string, string>} Each dependency's range, by name
 */
function rangesIn(field) {
  /** @type {Map<string, string>} */
  const found = new Map()
  if (typeof field === 'object' && field !== null) {
    for (const [name, range] of Object.entries(field)) {
      if (typeof range === 'string') {
        found.set(name, range)
      }
    }
  }
  return found
}

/**
 * A manifest, read
 * @param {string} path - The package.json
 * @returns {Promise<Readonly<Record<string, unknown>>>} Its fields
 */
async function manifestAt(path) {
  /** @type {unknown} */
  const raw = await Bun.file(path).json()
  if (typeof raw !== 'object' || raw === null) {
    throw new TypeError(`${path} is not a manifest`)
  }
  return Object.fromEntries(Object.entries(raw))
}

/**
 * The packages released from the repo: every package that isn't private, with which of the others it depends on
 * @param {string} root - The repo
 * @returns {Promise<Package[]>} Them, by dir
 */
async function packagesIn(root) {
  const files = await Array.fromAsync(new Bun.Glob('packages/*/package.json').scan({ cwd: root }))
  const manifests = await Promise.all(files.map(async (file) => manifestAt(`${root}/${file}`)))
  /** @type {readonly Readonly<{ dependencies: readonly string[], dir: string, name: string, version: string }>[]} */
  const found = files.flatMap((file, index) => {
    const manifest = manifests[index] ?? {}
    const { name, private: isPrivate, version } = manifest
    if (isPrivate === true || typeof name !== 'string' || typeof version !== 'string') {
      return []
    }
    const dependencies = DEPENDENCY_FIELDS.flatMap((field) => [...rangesIn(manifest[field]).keys()])
    return [{ dependencies, dir: file.split('/')[1] ?? '', name, version }]
  })
  const names = new Map(found.map(({ dir, name }) => [name, dir]))
  /** @type {readonly Package[]} */
  const all = found.map(({ dependencies, dir, name, version }) => ({
    dir,
    internal: dependencies.flatMap((dependency) => {
      const other = names.get(dependency)
      return other === undefined ? [] : [other]
    }),
    name,
    version,
  }))
  return all.toSorted((one, other) => one.dir.localeCompare(other.dir))
}

/**
 * The version of a package's last release, from its tags
 * @param {string} root - The repo
 * @param {string} dir - The package's dir
 * @returns {Promise<string | undefined>} The version, or none if it has never been released
 */
async function lastRelease(root, dir) {
  const tags = await git(root, ['tag', '--list', `${dir}@*`])
  const versions = tags
    .split('\n')
    .filter((tag) => tag !== '')
    .map((tag) => tag.slice(dir.length + 1))
  return versions.toSorted(compareVersions).at(-1)
}

/**
 * The changes recorded in `.changes/`
 * @param {string} root - The repo
 * @param {ReadonlySet<string>} dirs - The packages' dirs, by which changes name them
 * @returns {Promise<Change[]>} Each change
 */
async function changesIn(root, dirs) {
  const files = await Array.fromAsync(new Bun.Glob(`${CHANGES}/*.md`).scan({ cwd: root }))
  const texts = await Promise.all(files.map(async (file) => Bun.file(`${root}/${file}`).text()))
  return files.toSorted().map((file) => {
    const text = texts[files.indexOf(file)] ?? ''
    const match = /^---\n(?<head>[\s\S]*?)\n---\n(?<body>[\s\S]*)$/u.exec(text)
    if (match?.groups === undefined) {
      throw new Error(`${file} doesn't start with a --- block naming packages and levels`)
    }
    /** @type {Map<string, Level>} */
    const levels = new Map()
    for (const line of (match.groups['head'] ?? '').split('\n').filter((each) => each.trim() !== '')) {
      const [dir = '', level = ''] = line.split(':').map((part) => part.trim())
      if (!dirs.has(dir)) {
        throw new Error(`${file} names ${dir}, which is no package released from here`)
      }
      if (!isLevel(level)) {
        throw new Error(`${file} gives ${dir} the level ${level}; it is major, minor or patch`)
      }
      levels.set(dir, level)
    }
    return { file, levels, summary: (match.groups['body'] ?? '').trim() }
  })
}

/**
 * Whether a package ships anything changed since a release
 * @param {string} root - The repo
 * @param {string} dir - The package's dir
 * @param {string} since - The release's tag
 * @param {Outside} outside - npm, for what the package ships
 * @returns {Promise<boolean>} Whether a file it ships changed, or a file not a test was deleted
 */
async function shipsChanges(root, dir, since, outside) {
  const [listed, shipped] = await Promise.all([
    git(root, ['diff', '--name-status', since, 'HEAD', '--', `packages/${dir}`]),
    outside.shipped(`${root}/packages/${dir}`),
  ])
  const ships = new Set(shipped)
  return listed
    .split('\n')
    .filter((line) => line !== '')
    .some((line) => {
      const [status = '', ...paths] = line.split('\t')
      const path = (paths.at(-1) ?? '').slice(`packages/${dir}/`.length)
      return ships.has(path) || (status.startsWith('D') && !TEST_FILE.test(path))
    })
}

/**
 * The packages in an order where each comes after those it depends on
 * @param {readonly Package[]} packages - The packages
 * @returns {Package[]} Them, ordered
 */
function dependencyOrder(packages) {
  /** @type {Package[]} */
  const ordered = []
  /** @type {Set<string>} */
  const placed = new Set()
  /**
   * Places a package after what it depends on
   * @param {Package} pkg - The package
   * @returns {void}
   */
  const place = (pkg) => {
    if (placed.has(pkg.dir)) {
      return
    }
    placed.add(pkg.dir)
    for (const dir of pkg.internal) {
      const dependency = packages.find((each) => each.dir === dir)
      if (dependency !== undefined) {
        place(dependency)
      }
    }
    ordered.push(pkg)
  }
  for (const pkg of packages) {
    place(pkg)
  }
  return ordered
}

/**
 * What a release would release, from the tags, the recorded changes and what changed
 * @param {string} root - The repo
 * @param {readonly Package[]} packages - The packages
 * @param {ReadonlyMap<string, string | undefined>} released - Each package's last release
 * @param {readonly Change[]} changes - The recorded changes
 * @param {Outside} outside - npm, for what each package ships
 * @returns {Promise<Planned[]>} Each package released, its new version and why, in dependency order
 */
async function plan(root, packages, released, changes, outside) {
  const changed = await Promise.all(
    packages.map(async (pkg) => {
      const last = released.get(pkg.dir)
      return last === undefined ? true : shipsChanges(root, pkg.dir, `${pkg.dir}@${last}`, outside)
    }),
  )
  /** @type {Map<string, { level: Level | undefined, why: string }>} */
  const moving = new Map()
  for (const [index, pkg] of packages.entries()) {
    const recorded = changes.reduce(
      /**
       * @param {Level | undefined} level - The level so far
       * @param {Change} change - A change
       * @returns {Level | undefined} The level with it
       */
      (level, change) => {
        const its = change.levels.get(pkg.dir)
        return its === undefined ? level : higher(level, its)
      },
      undefined,
    )
    if (released.get(pkg.dir) === undefined) {
      moving.set(pkg.dir, { level: undefined, why: 'first release' })
    } else if (recorded !== undefined) {
      moving.set(pkg.dir, { level: recorded, why: `${recorded}, recorded in ${CHANGES}/` })
    } else if (changed[index] === true) {
      throw new Error(
        `${pkg.dir} changed since ${pkg.dir}@${String(released.get(pkg.dir))}, and no ${CHANGES}/ file names it`,
      )
    }
  }
  let grew = true
  while (grew) {
    grew = false
    for (const pkg of packages) {
      const dependency = pkg.internal.find((dir) => moving.has(dir))
      if (!moving.has(pkg.dir) && dependency !== undefined) {
        moving.set(pkg.dir, {
          level: 'patch',
          why: `patch, as ${dependency} is released and the range it is published with moves`,
        })
        grew = true
      }
    }
  }
  return dependencyOrder(packages.filter((pkg) => moving.has(pkg.dir))).map((pkg) => {
    const { level, why } = moving.get(pkg.dir) ?? { level: undefined, why: '' }
    return { pkg, version: level === undefined ? pkg.version : bump(pkg.version, level), why }
  })
}

/**
 * A manifest's text with its version set
 * @param {string} text - The manifest
 * @param {string} version - The version
 * @returns {string} The manifest with it
 */
function withVersion(text, version) {
  return text.replace(/(?<head>"version"\s*:\s*")[^"]*(?<tail>")/u, `$<head>${version}$<tail>`)
}

/**
 * A manifest's text with each `workspace:` range on another of these packages made the range it is published with
 * @param {string} text - The manifest
 * @param {ReadonlyMap<string, string>} versions - Each package's version, by name
 * @returns {string} The manifest to publish
 */
function publishedManifest(text, versions) {
  return text.replaceAll(
    /"(?<name>[^"]+)"\s*:\s*"workspace:(?<range>[^"]*)"/gu,
    /**
     * @param {string} _whole - The dependency as written
     * @param {string} name - Its package
     * @param {string} range - What follows `workspace:`
     * @returns {string} The dependency as published
     */
    (_whole, name, range) => {
      const version = versions.get(name)
      if (version === undefined) {
        throw new Error(`${name} is a workspace: dependency on no package released from here`)
      }
      const published =
        range === '*' || range === '' ? version : range === '~' || range === '^' ? `${range}${version}` : range
      return `"${name}": "${published}"`
    },
  )
}

/**
 * Publishes every package whose last release npm doesn't have, asking for the one-time password once
 * @param {string} root - The repo
 * @param {readonly Package[]} packages - The packages, at their last release
 * @param {readonly Package[]} waiting - Those npm doesn't have
 * @param {Outside} outside - npm and the person running it
 * @param {boolean} dryRun - Whether only to say what it would do
 * @returns {Promise<boolean>} Whether all were published
 */
async function publishWaiting(root, packages, waiting, outside, dryRun) {
  if (waiting.length === 0) {
    return true
  }
  const versions = new Map(packages.map((pkg) => [pkg.name, pkg.version]))
  if (dryRun) {
    for (const pkg of waiting) {
      outside.log(`would publish ${pkg.name}@${pkg.version}`)
    }
    return true
  }
  const otp = await outside.askOtp()
  for (const pkg of dependencyOrder(waiting)) {
    const path = `${root}/packages/${pkg.dir}/package.json`
    // oxlint-disable-next-line no-await-in-loop -- one publish after another: a failure stops the rest
    const original = await Bun.file(path).text()
    try {
      // oxlint-disable-next-line no-await-in-loop -- one publish after another: a failure stops the rest
      await Bun.write(path, publishedManifest(original, versions))
      // oxlint-disable-next-line no-await-in-loop -- one publish after another: a failure stops the rest
      await outside.publish(`${root}/packages/${pkg.dir}`, otp)
      outside.log(`published ${pkg.name}@${pkg.version}`)
    } catch (error) {
      outside.log(
        `publishing ${pkg.name}@${pkg.version} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      outside.log('run the release again to publish what is left')
      return false
    } finally {
      // oxlint-disable-next-line no-await-in-loop -- one publish after another: a failure stops the rest
      await Bun.write(path, original)
    }
  }
  return true
}

/**
 * Releases what changed, or finishes publishing a release that stopped partway
 * @param {Readonly<{ root: string, dryRun: boolean, outside: Outside }>} options - The repo, whether only to say what
 *   it would do, and npm and the person running it
 * @returns {Promise<boolean>} Whether it all went through
 */
async function release({ dryRun, outside, root }) {
  const dirty = await git(root, ['status', '--porcelain'])
  if (dirty !== '' && !dryRun) {
    throw new Error('The working tree has changes: commit them first')
  }
  const packages = await packagesIn(root)
  const lasts = await Promise.all(packages.map(async (pkg) => lastRelease(root, pkg.dir)))
  const released = new Map(packages.map((pkg, index) => [pkg.dir, lasts[index]]))
  for (const pkg of packages) {
    const last = released.get(pkg.dir)
    if (last !== undefined && last !== pkg.version) {
      throw new Error(
        `${pkg.dir} says ${pkg.version} but its last release is ${last}: a version changes only in a release`,
      )
    }
  }
  const onNpm = await Promise.all(
    packages.map(async (pkg) =>
      released.get(pkg.dir) === undefined ? true : outside.published(pkg.name, pkg.version),
    ),
  )
  const waiting = packages.filter((_, index) => onNpm[index] === false)
  if (waiting.length > 0) {
    const moved = await Promise.all(
      waiting.map(async (pkg) => shipsChanges(root, pkg.dir, `${pkg.dir}@${pkg.version}`, outside)),
    )
    const stale = waiting.filter((_, index) => moved[index] === true)
    if (stale.length > 0) {
      throw new Error(`${stale.map((pkg) => pkg.dir).join(', ')} changed since a release npm doesn't have yet`)
    }
    outside.log(
      `finishing a release npm doesn't have all of: ${waiting.map((pkg) => `${pkg.dir}@${pkg.version}`).join(', ')}`,
    )
    return publishWaiting(root, packages, waiting, outside, dryRun)
  }
  const changes = await changesIn(root, new Set(packages.map((pkg) => pkg.dir)))
  const planned = await plan(root, packages, released, changes, outside)
  if (planned.length === 0) {
    outside.log('nothing to release')
    return true
  }
  for (const { pkg, version, why } of planned) {
    outside.log(`${pkg.dir}: ${pkg.version} -> ${version} (${why})`)
  }
  const tags = planned.map(({ pkg, version }) => `${pkg.dir}@${version}`)
  const subject = `release: ${tags.join(', ')}`
  const body = changes.map((change) => `- ${change.summary.replaceAll('\n', '\n  ')}`).join('\n')
  outside.log(`${dryRun ? 'would commit' : 'committing'}: ${subject}`)
  for (const change of changes) {
    outside.log(`  ${dryRun ? 'would delete' : 'deleting'} ${change.file}`)
  }
  outside.log(`${dryRun ? 'would tag' : 'tagging'}: ${tags.join(' ')}`)
  const after = packages.map((pkg) => {
    const its = planned.find((each) => each.pkg.dir === pkg.dir)
    return its === undefined ? pkg : { ...pkg, version: its.version }
  })
  if (dryRun) {
    return publishWaiting(
      root,
      after,
      planned.map(({ pkg, version }) => ({ ...pkg, version })),
      outside,
      true,
    )
  }
  await Promise.all(
    planned.map(async ({ pkg, version }) => {
      const path = `${root}/packages/${pkg.dir}/package.json`
      const text = await Bun.file(path).text()
      await Bun.write(path, withVersion(text, version))
    }),
  )
  if (changes.length > 0) {
    await git(root, ['rm', '-q', ...changes.map((change) => change.file)])
  }
  await git(root, ['add', ...planned.map(({ pkg }) => `packages/${pkg.dir}/package.json`)])
  await git(root, ['commit', '-q', '-m', body === '' ? subject : `${subject}\n\n${body}`])
  await Promise.all(tags.map(async (tag) => git(root, ['tag', '-a', tag, '-m', tag])))
  return publishWaiting(
    root,
    after,
    planned.map(({ pkg, version }) => ({ ...pkg, version })),
    outside,
    false,
  )
}

/**
 * Runs a command, failing with what it printed
 * @param {readonly string[]} command - The command
 * @param {string} cwd - Where
 * @returns {Promise<string>} What it printed
 */
async function run(command, cwd) {
  const child = Bun.spawn([...command], { cwd, stderr: 'pipe', stdout: 'pipe' })
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (code !== 0) {
    throw new Error(`${command.join(' ')} failed:\n${err}`)
  }
  return out
}

/** @type {Outside} */
const npm = {
  askOtp: () => Promise.resolve(prompt('npm one-time password:') ?? ''),
  log: (line) => {
    console.log(line)
  },
  async publish(dir, otp) {
    await run(['npm', 'publish', `--otp=${otp}`], dir)
  },
  async published(name, version) {
    const child = Bun.spawn(['npm', 'view', `${name}@${version}`, 'version', '--json'], {
      stderr: 'pipe',
      stdout: 'pipe',
    })
    const [out, err, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (code === 0) {
      return out.trim() !== ''
    }
    if (`${out}${err}`.includes('E404')) {
      return false
    }
    throw new Error(`npm view ${name}@${version} failed:\n${err}`)
  },
  async shipped(dir) {
    /** @type {unknown} */
    const packed = JSON.parse(await run(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'], dir))
    if (!Array.isArray(packed)) {
      throw new TypeError('npm pack gave no list')
    }
    /** @type {unknown[]} */
    const entries = packed
    return entries.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null || !('files' in entry) || !Array.isArray(entry.files)) {
        return []
      }
      /** @type {unknown[]} */
      const files = entry.files
      return files.flatMap((file) =>
        typeof file === 'object' && file !== null && 'path' in file && typeof file.path === 'string' ? [file.path] : [],
      )
    })
  },
}

if (import.meta.main) {
  const root = new URL('..', import.meta.url).pathname
  const ok = await release({ dryRun: Bun.argv.includes('--dry-run'), outside: npm, root }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    return false
  })
  process.exitCode = ok ? 0 : 1
}

export { bump, publishedManifest, release }
