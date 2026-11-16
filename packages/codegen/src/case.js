/**
 * `String.prototype.toLowerCase` for Lua on UTF-8, made from the generator's own JavaScript: every code point whose
 * lowercase differs, as runs (`from`, `to`, `step`, `delta`), the ones lowercased to several code points, and the
 * Cased and Case_Ignorable code points Final_Sigma reads (Σ is ς after a cased letter, case-ignorables between, not
 * followed by one). Exact for well-formed UTF-8, in the Unicode version of the JavaScript that generated it.
 */

/** @type {string[] | null} */
let made = null

/**
 * The Lua helper `lower(s)`, its tables first
 * @returns {readonly string[]} Its lines
 */
function lowerHelper() {
  made ??= build()
  return made
}

/**
 * @returns {string[]} The helper's lines
 */
function build() {
  /** @type {{ from: number, to: number, step: number, delta: number }[]} */
  const runs = []
  /** @type {string[]} */
  const multi = []
  for (const cp of codePoints()) {
    const text = String.fromCodePoint(cp)
    const lowered = codePointsOf(text.toLowerCase())
    const [only] = lowered
    if (lowered.length === 1 && only === cp) {
      continue
    }
    if (lowered.length !== 1 || only === undefined) {
      multi.push(`[${String(cp)}] = "${lowered.map((one) => utf8Escaped(one)).join('')}"`)
      continue
    }
    const delta = only - cp
    const last = runs.at(-1)
    if (last?.delta === delta && cp - last.to <= 2 && (last.step === 0 || cp - last.to === last.step)) {
      last.step = cp - last.to
      last.to = cp
    } else {
      runs.push({ delta, from: cp, step: 0, to: cp })
    }
  }
  const flatRuns = runs.flatMap((run) => [run.from, run.to, run.step === 0 ? 1 : run.step, run.delta])
  const version = typeof process === 'undefined' ? undefined : process.versions['unicode']
  return [
    `-- String.prototype.toLowerCase on UTF-8, as JavaScript does it (Unicode ${version ?? 'of the generator'}): runs`,
    '-- of code points (from, to, step, delta), the ones made several, and the Cased and Case_Ignorable ranges',
    '-- Final_Sigma reads',
    `local LOWER_RUNS = { ${flatRuns.join(', ')} }`,
    `local LOWER_MULTI = { ${multi.join(', ')} }`,
    `local CASED = { ${ranges(/^\p{Cased}$/u).join(', ')} }`,
    `local CASE_IGNORABLE = { ${ranges(/^\p{Case_Ignorable}$/u).join(', ')} }`,
    'local LOWER = {}',
    'for i = 1, #LOWER_RUNS, 4 do',
    '  for cp = LOWER_RUNS[i], LOWER_RUNS[i + 1], LOWER_RUNS[i + 2] do LOWER[cp] = cp + LOWER_RUNS[i + 3] end',
    'end',
    'local ASCII_LOWER = {}',
    'for b = 65, 90 do ASCII_LOWER[string.char(b)] = string.char(b + 32) end',
    'local function in_ranges(list, cp)',
    '  local lo, hi = 1, #list / 2',
    '  while lo <= hi do',
    '    local mid = math.floor((lo + hi) / 2)',
    '    if cp < list[2 * mid - 1] then hi = mid - 1',
    '    elseif cp > list[2 * mid] then lo = mid + 1',
    '    else return true end',
    '  end',
    '  return false',
    'end',
    'local function utf8_char(cp)',
    '  if cp < 0x80 then return string.char(cp) end',
    '  if cp < 0x800 then return string.char(0xC0 + math.floor(cp / 0x40), 0x80 + cp % 0x40) end',
    '  if cp < 0x10000 then',
    '    return string.char(0xE0 + math.floor(cp / 0x1000), 0x80 + math.floor(cp / 0x40) % 0x40, 0x80 + cp % 0x40)',
    '  end',
    '  return string.char(0xF0 + math.floor(cp / 0x40000), 0x80 + math.floor(cp / 0x1000) % 0x40,',
    '    0x80 + math.floor(cp / 0x40) % 0x40, 0x80 + cp % 0x40)',
    'end',
    '-- Whether the cased letter nearest a position, case-ignorables passed over, is there',
    'local function cased_near(cps, from, to, by)',
    '  for j = from, to, by do',
    '    local cp = cps[j]',
    '    if not in_ranges(CASE_IGNORABLE, cp) then return in_ranges(CASED, cp) end',
    '  end',
    '  return false',
    'end',
    'local function lower(s)',
    String.raw`  if not s:find("[\128-\255]") then return (s:gsub("[A-Z]", ASCII_LOWER)) end`,
    '  local cps, n, i = {}, 0, 1',
    '  while i <= #s do',
    '    local c = s:byte(i)',
    '    local cp, size',
    '    if c < 0x80 then cp, size = c, 1',
    '    elseif c >= 0xF0 then',
    '      cp = (c - 0xF0) * 0x40000 + (s:byte(i + 1) - 0x80) * 0x1000 + (s:byte(i + 2) - 0x80) * 0x40 + s:byte(i + 3) - 0x80',
    '      size = 4',
    '    elseif c >= 0xE0 then',
    '      cp, size = (c - 0xE0) * 0x1000 + (s:byte(i + 1) - 0x80) * 0x40 + s:byte(i + 2) - 0x80, 3',
    '    else',
    '      cp, size = (c - 0xC0) * 0x40 + s:byte(i + 1) - 0x80, 2',
    '    end',
    '    n = n + 1',
    '    cps[n] = cp',
    '    i = i + size',
    '  end',
    '  local out = {}',
    '  for k = 1, n do',
    '    local cp = cps[k]',
    '    if cp == 0x3A3 then',
    '      local final = cased_near(cps, k - 1, 1, -1) and not cased_near(cps, k + 1, n, 1)',
    String.raw`      out[k] = final and "\207\130" or "\207\131"`,
    '    else',
    '      out[k] = LOWER_MULTI[cp] or utf8_char(LOWER[cp] or cp)',
    '    end',
    '  end',
    '  return table.concat(out)',
    'end',
  ]
}

/** The last code point, and the surrogates' first and last, which no scalar value is */
const LAST = 1_114_111
const SURROGATES = [55_296, 57_343]

/**
 * Every Unicode scalar value
 * @returns {number[]} Them
 */
function codePoints() {
  /** @type {number[]} */
  const all = []
  for (let cp = 0; cp <= LAST; cp += 1) {
    if (cp < (SURROGATES[0] ?? 0) || cp > (SURROGATES[1] ?? 0)) {
      all.push(cp)
    }
  }
  return all
}

/**
 * The code points a property holds, as flat pairs of the first and last of each range
 * @param {RegExp} property - A test of one code point
 * @returns {number[]} The pairs
 */
function ranges(property) {
  /** @type {[number, number][]} */
  const found = []
  for (const cp of codePoints()) {
    if (property.test(String.fromCodePoint(cp))) {
      const last = found.at(-1)
      if (last?.[1] === cp - 1 || (last?.[1] === (SURROGATES[0] ?? 0) - 1 && cp === (SURROGATES[1] ?? 0) + 1)) {
        last[1] = cp
      } else {
        found.push([cp, cp])
      }
    }
  }
  return found.flat()
}

/**
 * A string's code points
 * @param {string} text - The string
 * @returns {number[]} Its code points
 */
function codePointsOf(text) {
  /** @type {number[]} */
  const all = []
  for (let at = 0; at < text.length;) {
    const cp = text.codePointAt(at) ?? 0
    all.push(cp)
    at += cp > 65_535 ? 2 : 1
  }
  return all
}

/**
 * A code point as UTF-8 in a Lua string literal
 * @param {number} cp - The code point
 * @returns {string} Its bytes, escaped
 */
function utf8Escaped(cp) {
  return [...new TextEncoder().encode(String.fromCodePoint(cp))].map((byte) => `\\${String(byte)}`).join('')
}

export { lowerHelper }
