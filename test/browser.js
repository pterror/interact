/**
 * Runs test code in real Chrome, for what happy-dom doesn't do faithfully: adopted stylesheets, `@scope`, declarative
 * shadow roots, layout. Chrome is found as `$CHROME`, `google-chrome`, `google-chrome-stable` or `chromium`; without
 * one, every browser test fails rather than being skipped.
 */

import { chromium } from 'playwright-core'

/** @import { Browser } from 'playwright-core' */

const ROOT = new URL('..', import.meta.url).pathname
const PAGE = /^\/(?<dir>.*)\/__page-(?<id>\d+)\.html$/u
const FORBIDDEN = 403
const MISSING = 404
const NONE = 0

/**
 * The browser and the server it loads pages from, started once per test run.
 * @typedef {Readonly<{ browser: Browser, server: Bun.Server<undefined>, pages: Map<string, string> }>} Running
 */

/** @type {Promise<Running> | undefined} */
let running = undefined

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
 * Starts Chrome and the page server.
 * @returns {Promise<Running>} Them
 */
async function launch() {
  /** @type {Map<string, string>} */
  const pages = new Map()
  const map = await importMap()
  const server = Bun.serve({ fetch: async (request) => respond(new URL(request.url).pathname, pages, map), port: NONE })
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: chromePath() })
  return { browser, pages, server }
}

/**
 * Opens a page in the test file's directory, noting any errors in it.
 * @param {string} moduleUrl - The test file's `import.meta.url`
 * @param {string} body - Markup for the page's body
 * @returns {Promise<Readonly<{ page: import('playwright-core').Page, errors: readonly Error[] }>>} The page, and its errors
 */
async function openPage(moduleUrl, body) {
  running ??= launch()
  const { browser, pages, server } = await running
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
 * Runs a function in a fresh Chrome page, beside the test file: the page is in the file's directory, so the function's
 * imports (`await import('./x.js')`) resolve as the file's do, and are typed as they are. Errors in the page fail it.
 * @template R
 * @param {string} moduleUrl - The test file's `import.meta.url`
 * @param {() => R | Promise<R>} run - What to run; it can't use the test file's variables, only what it imports
 * @param {string} [body] - Markup for the page's body, parsed as a page load parses it (declarative shadow roots too)
 * @returns {Promise<R>} What it returned
 */
async function inBrowser(moduleUrl, run, body = '') {
  const { errors, page } = await openPage(moduleUrl, body)
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
 * Opens a fresh Chrome page beside the test file and hands it to `drive`, for what a function run inside the page
 * can't do: real input (the mouse wheel, keys) and waiting between steps. Errors in the page fail it.
 * @template R
 * @param {string} moduleUrl - The test file's `import.meta.url`
 * @param {string} body - Markup for the page's body
 * @param {(page: import('playwright-core').Page) => Promise<R>} drive - What to do with the page
 * @returns {Promise<R>} What it returned
 */
async function withPage(moduleUrl, body, drive) {
  const { errors, page } = await openPage(moduleUrl, body)
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
 * Stops Chrome and the page server, if they started.
 * @returns {Promise<void>} When they have stopped
 */
async function closeBrowser() {
  if (!running) {
    return
  }
  const { browser, server } = await running
  running = undefined
  await browser.close()
  await server.stop()
}

export { closeBrowser, inBrowser, withPage }
