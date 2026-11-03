/**
 * Runs test code in real browsers, for what happy-dom doesn't do faithfully: adopted stylesheets, `@scope`,
 * declarative shadow roots, layout. Chrome is found as `$CHROME`, `google-chrome`, `google-chrome-stable` or
 * `chromium`; Firefox and WebKit are playwright's, from `$PLAYWRIGHT_BROWSERS_PATH` (the dev shell sets it). Without
 * one, every test in it fails rather than being skipped.
 */

/// <reference path="./axe-global.d.ts" />

import { chromium, firefox, webkit } from 'playwright-core'

/** @import { Browser, Page } from 'playwright-core' */

/**
 * A browser engine the tests run in.
 * @typedef {'chrome' | 'firefox' | 'webkit'} Engine
 */

/** @type {readonly Engine[]} */
const BROWSERS = ['chrome', 'firefox', 'webkit']
const AXE = new URL(import.meta.resolve('axe-core/axe.min.js')).pathname

const ROOT = new URL('..', import.meta.url).pathname
const PAGE = /^\/(?<dir>.*)\/__page-(?<id>\d+)\.html$/u
const FORBIDDEN = 403
const MISSING = 404
const NONE = 0
/** How long starting or stopping the browsers may take: setup, not part of any test's own time. */
const BROWSER_SETUP_MS = 60_000

/**
 * The server pages are loaded from, started once per test run, and the test pages' bodies it serves.
 * @typedef {Readonly<{ server: Bun.Server<undefined>, pages: Map<string, string> }>} Serving
 */

/** @type {Promise<Serving> | undefined} */
let serving = undefined
/** @type {Map<Engine, Promise<Browser>>} */
const launched = new Map()

/**
 * The Chrome to run.
 * @returns {string} Its path
 */
function chromePath() {
  const found =
    Bun.env['CHROME'] ?? Bun.which('google-chrome') ?? Bun.which('google-chrome-stable') ?? Bun.which('chromium')
  if (found === null) {
    throw new Error('The browser tests need Chrome: install it, or set CHROME to its path')
  }
  return found
}

/**
 * The import map that lets pages import the packages by name, as an app would.
 * @returns {Promise<string>} The map, as JSON
 */
async function importMap() {
  /** @type {Record<string, string>} */
  const imports = {}
  for await (const file of new Bun.Glob('packages/*/package.json').scan({ cwd: ROOT })) {
    /** @type {unknown} */
    const manifest = await Bun.file(`${ROOT}${file}`).json()
    const dir = file.replace(/package\.json$/u, 'src/')
    if (typeof manifest === 'object' && manifest !== null && 'name' in manifest && typeof manifest.name === 'string') {
      imports[manifest.name] = `/${dir}index.js`
      imports[`${manifest.name}/`] = `/${dir}`
    }
  }
  return JSON.stringify({ imports })
}

/**
 * Answers one request: a test page, or a file under the repo root.
 * @param {string} path - The request's path
 * @param {ReadonlyMap<string, string>} pages - Test pages' bodies, by id
 * @param {string} map - The import map
 * @returns {Promise<Response>} The response
 */
async function respond(path, pages, map) {
  const page = PAGE.exec(path)?.groups
  if (page) {
    const body = pages.get(page['id'] ?? '') ?? ''
    const html = `<!doctype html><html><head><script type="importmap">${map}</script></head><body>${body}</body></html>`
    return new Response(html, { headers: { 'content-type': 'text/html' } })
  }
  const file = new URL(`.${decodeURIComponent(path)}`, `file://${ROOT}`).pathname
  if (!file.startsWith(ROOT)) {
    return new Response(undefined, { status: FORBIDDEN })
  }
  const found = Bun.file(file)
  return (await found.exists()) ? new Response(found) : new Response(undefined, { status: MISSING })
}

/**
 * Starts the page server.
 * @returns {Promise<Serving>} It, and the pages it serves
 */
async function serve() {
  /** @type {Map<string, string>} */
  const pages = new Map()
  const map = await importMap()
  const server = Bun.serve({ fetch: async (request) => respond(new URL(request.url).pathname, pages, map), port: NONE })
  return { pages, server }
}

/**
 * Starts a browser.
 * @param {Engine} engine - Which
 * @returns {Promise<Browser>} It
 */
async function launch(engine) {
  if (engine === 'chrome') {
    return chromium.launch({ args: ['--no-sandbox'], executablePath: chromePath() })
  }
  return engine === 'firefox' ? firefox.launch() : webkit.launch()
}

/**
 * A browser the test file started.
 * @param {Engine} engine - Which
 * @returns {Promise<Browser>} It
 * @throws {Error} If the file didn't start its browsers with useBrowsers()
 */
async function browserFor(engine) {
  const started = launched.get(engine)
  if (started === undefined) {
    throw new Error(
      'A browser test file starts its browsers in its beforeAll: beforeAll(startBrowsers, BROWSER_SETUP_MS)',
    )
  }
  return started
}

/**
 * Starts every browser, for a test file's `beforeAll` with `BROWSER_SETUP_MS`: setup with its own time, so how long a
 * browser takes to start is never counted against the test that happens to open the first page.
 * @returns {Promise<void>} When they have started
 */
async function startBrowsers() {
  for (const engine of BROWSERS) {
    launched.set(engine, launch(engine))
  }
  await Promise.all(launched.values())
}

/**
 * Where a test page opens: the browser, the test file's `import.meta.url` (the page is in the file's directory), and
 * markup for the page's body, parsed as a page load parses it (declarative shadow roots too).
 * @typedef {Readonly<{ engine: Engine, moduleUrl: string, body?: string }>} PageOptions
 */

/**
 * Opens a page in the test file's directory, noting any errors in it.
 * @param {PageOptions} options - Where it opens
 * @returns {Promise<Readonly<{ page: Page, errors: readonly Error[] }>>} The page, and its errors
 */
async function openPage({ body = '', engine, moduleUrl }) {
  serving ??= serve()
  const { pages, server } = await serving
  const browser = await browserFor(engine)
  const id = String(pages.size)
  pages.set(id, body)
  const page = await browser.newPage()
  /** @type {Error[]} */
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error)
  })
  await page.goto(`${server.url.href}${new URL('.', moduleUrl).pathname.slice(ROOT.length)}__page-${id}.html`)
  return { errors, page }
}

/**
 * Runs a function in a fresh page, beside the test file: the page is in the file's directory, so the function's
 * imports (`await import('./x.js')`) resolve as the file's do, and are typed as they are. Errors in the page fail it.
 * @template R
 * @param {PageOptions} options - Where the page opens
 * @param {() => R | Promise<R>} run - What to run; it can't use the test file's variables, only what it imports
 * @returns {Promise<R>} What it returned
 */
async function inBrowser(options, run) {
  const { errors, page } = await openPage(options)
  try {
    const result = await page.evaluate(run)
    if (errors.length > NONE) {
      throw new AggregateError(errors, `The page had errors: ${errors.map((error) => error.message).join('; ')}`)
    }
    return result
  } finally {
    await page.close()
  }
}

/**
 * Opens a fresh page beside the test file and hands it to `drive`, for what a function run inside the page can't do:
 * real input (the mouse wheel, keys) and waiting between steps. Errors in the page fail it.
 * @template R
 * @param {PageOptions} options - Where the page opens
 * @param {(page: Page) => Promise<R>} drive - What to do with the page
 * @returns {Promise<R>} What it returned
 */
async function withPage(options, drive) {
  const { errors, page } = await openPage(options)
  try {
    const result = await drive(page)
    if (errors.length > NONE) {
      throw new AggregateError(errors, `The page had errors: ${errors.map((error) => error.message).join('; ')}`)
    }
    return result
  } finally {
    await page.close()
  }
}

/**
 * The accessibility problems axe-core finds in what a selector picks out of a page, shadow roots included, with every
 * rule it runs by default (WCAG 2 A and AA, and its best practices).
 * @param {Page} page - The page
 * @param {string} selector - What to check
 * @returns {Promise<string[]>} Each problem, as "rule: element"
 */
async function audit(page, selector) {
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async (context) => {
    const results = await axe.run(context)
    return results.violations.flatMap((violation) =>
      violation.nodes.map((node) => `${violation.id}: ${node.target.flat().join(' ')}`),
    )
  }, selector)
}

/**
 * Stops the browsers and the page server, if they started.
 * @returns {Promise<void>} When they have stopped
 */
async function stopBrowsers() {
  const browsers = [...launched.values()]
  launched.clear()
  const started = serving
  serving = undefined
  await Promise.all(
    browsers.map(async (starting) => {
      const browser = await starting
      await browser.close()
    }),
  )
  if (started) {
    const { server } = await started
    await server.stop()
  }
}

export { BROWSERS, BROWSER_SETUP_MS, audit, inBrowser, startBrowsers, stopBrowsers, withPage }
