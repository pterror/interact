/**
 * For the equivalence tests: one serialization of plain data that JavaScript and Lua both write the same way, inputs
 * written as Lua, the Lua driver, and the input runs each widget is checked over, made at random by an environment
 * that answers what the reference widget asks.
 *
 * The serialization identifies what Lua can't tell apart and JavaScript's plain data never relies on: a null field
 * and an absent one (records have every field their type has), and an empty array and an empty record.
 */

import { deliver, isRecord, start } from '@pterror/interact-core/compose'

/** @import { AnyLeaf, AnyWidget, Out } from '@pterror/interact-core/compose' */
/** @import { Key, Path } from '@pterror/interact-core/contract' */

/**
 * Numbers 1 to 2^31 - 2, the same in any engine: every product stays below 2^53
 * @param {number} seed - The seed, 1 to 2^31 - 2
 * @returns {() => number} The next number
 */
function rng(seed) {
  let at = seed
  return () => {
    at = (at * 16_807) % 2_147_483_647
    return at
  }
}

/**
 * Choices from a generator
 * @typedef {Readonly<{
 *   int: (below: number) => number,
 *   chance: (percent: number) => boolean,
 *   pick: <T>(list: readonly T[]) => T,
 * }>} Random
 */

/**
 * Choices from a seed
 * @param {number} seed - The seed
 * @returns {Random} The choices
 */
function random(seed) {
  const next = rng(seed)
  /**
   * @param {number} below - The bound
   * @returns {number} 0 to `below - 1`
   */
  const int = (below) => next() % below
  return {
    chance: (percent) => int(100) < percent,
    int,
    pick: (list) => {
      const one = list[int(list.length)]
      if (one === undefined) {
        throw new Error('pick from nothing')
      }
      return one
    },
  }
}

/**
 * A number as both serializations write it: an integer in decimal, any other double by its bits
 * @param {number} value - The number
 * @returns {string} Its text
 */
function numberText(value) {
  if (Number.isNaN(value)) {
    return 'nan'
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? 'inf' : '-inf'
  }
  if (Object.is(value, -0)) {
    return '-0'
  }
  if (Number.isInteger(value) && Math.abs(value) < 2 ** 53) {
    return String(value)
  }
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value)
  return `f:${view.getBigUint64(0).toString(16).padStart(16, '0')}`
}

/**
 * Plain data, serialized: the one text JavaScript and Lua agree on
 * @param {unknown} value - The value
 * @returns {string} Its text
 */
function canon(value) {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'number') {
    return numberText(value)
  }
  if (typeof value === 'string') {
    return quoteText(value)
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? '{}' : `[${value.map((item) => canon(item)).join(',')}]`
  }
  if (isRecord(value)) {
    const fields = Object.entries(value)
      .filter(([, field]) => field !== null && field !== undefined)
      .toSorted(([a], [b]) => (a < b ? -1 : 1))
    return `{${fields.map(([name, field]) => `${quoteText(name)}:${canon(field)}`).join(',')}}`
  }
  throw new TypeError(`Not plain data: ${typeof value}`)
}

/**
 * A string as the serialization writes it: `\` and `"` escaped, a control character as `\code;`
 * @param {string} text - The string
 * @returns {string} It, quoted
 */
function quoteText(text) {
  let out = '"'
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    out += char === '\\' || char === '"' ? `\\${char}` : code < 32 ? `\\${String(code)};` : char
  }
  return `${out}"`
}

/**
 * Plain data as a Lua expression, its strings' bytes UTF-8
 * @param {unknown} value - The value
 * @returns {string} The Lua source
 */
function toLua(value) {
  if (value === null || value === undefined) {
    return 'nil'
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Inputs hold finite numbers: ${String(value)}`)
    }
    return Object.is(value, -0) ? '-0.0' : String(value)
  }
  if (typeof value === 'string') {
    const bytes = [...new TextEncoder().encode(value)]
    return `"${bytes.map((byte) => (byte >= 32 && byte < 127 && byte !== 34 && byte !== 92 ? String.fromCodePoint(byte) : `\\${String(byte)}`)).join('')}"`
  }
  if (Array.isArray(value)) {
    if (value.some((item) => item === null || item === undefined)) {
      throw new TypeError('An array of inputs holds null')
    }
    return `{${value.map((item) => toLua(item)).join(',')}}`
  }
  if (isRecord(value)) {
    const fields = Object.entries(value).filter(([, field]) => field !== null && field !== undefined)
    return `{${fields.map(([name, field]) => `[${toLua(name)}]=${toLua(field)}`).join(',')}}`
  }
  throw new TypeError(`Not plain data: ${typeof value}`)
}

/** The Lua side: `canon` written in Lua, and the driver running a leaf's sequences or a composite's own calls */
const LUA_DRIVER = String.raw`
local ffi = require("ffi")
local bits = ffi.new("union { double d; uint64_t u; }")

local function number_text(n)
  if n ~= n then return "nan" end
  if n == math.huge then return "inf" end
  if n == -math.huge then return "-inf" end
  if n == 0 and 1 / n < 0 then return "-0" end
  if n == math.floor(n) and math.abs(n) < 2 ^ 53 then return string.format("%d", n) end
  bits.d = n
  return "f:" .. string.format("%016x", bits.u)
end

local function quote(s)
  return '"' .. s:gsub('[\\"%c]', function(c)
    if c == "\\" or c == '"' then return "\\" .. c end
    return "\\" .. tostring(c:byte()) .. ";"
  end) .. '"'
end

local canon
function canon(v)
  local t = type(v)
  if v == nil then return "null" end
  if t == "boolean" then return tostring(v) end
  if t == "number" then return number_text(v) end
  if t == "string" then return quote(v) end
  if t ~= "table" then error("not plain data: " .. t) end
  local count = 0
  for _ in pairs(v) do count = count + 1 end
  if count == 0 then return "{}" end
  if v[1] ~= nil and count == #v then
    local parts = {}
    for i = 1, #v do parts[i] = canon(v[i]) end
    return "[" .. table.concat(parts, ",") .. "]"
  end
  local keys = {}
  for k in pairs(v) do
    if type(k) ~= "string" then error("a record's key is not a string: " .. tostring(k)) end
    keys[#keys + 1] = k
  end
  table.sort(keys)
  local parts = {}
  for i = 1, #keys do parts[i] = quote(keys[i]) .. ":" .. canon(v[keys[i]]) end
  return "{" .. table.concat(parts, ",") .. "}"
end

local dir, module, name, data = arg[1], arg[2], arg[3], arg[4]
package.path = dir .. "/?.lua;" .. package.path
local widget = require(module)[name]
if arg[5] ~= nil then widget = widget(load("return " .. arg[5])()) end
-- A host turning the widget's calls back into effects, as its source gives them
local outs
local host = {}
for method, shape in pairs(widget.effects) do
  host[method] = function(from, ...)
    local effect = { type = shape.type }
    for i = 1, #shape.fields do
      local value = select(i, ...)
      -- A table the widget refills for its next call: kept as it is now
      if type(value) == "table" then
        local copy = {}
        for k, v in pairs(value) do copy[k] = v end
        value = copy
      end
      effect[shape.fields[i]] = value
    end
    outs[#outs + 1] = { effect = effect, from = from }
  end
end
local runs = dofile(data)
for r = 1, #runs do
  local run = runs[r]
  outs = {}
  local state = widget.init(run.props, host)
  io.write(canon(state), "\t", canon(outs), "\n")
  for i = 1, #run.deliveries do
    local delivery = run.deliveries[i]
    outs = {}
    state = widget.deliver(state, delivery.path, 0, delivery.input, host)
    io.write(canon(state), "\t", canon(outs), "\n")
  end
  io.write("--\n")
end
`

/**
 * A run of a leaf widget: its props, then the inputs
 * @typedef {Readonly<{ props: unknown, inputs: readonly unknown[] }>} LeafRun
 */

/**
 * A run of a composite: its props, then inputs to the widget at a path
 * @typedef {Readonly<{ props: unknown, deliveries: readonly Readonly<{ path: Path, input: unknown }>[] }>} CompositeRun
 */

/**
 * A call of a composite's own function: `step`, or a handler (`on/list/active`), with the input or effect it was
 * given and what a handler is told (where the effect came from, or whether the default was prevented)
 * @typedef {Readonly<{ fn: string, value: unknown, detail: Path | boolean | null }>} OwnCall
 */

/**
 * @typedef {Record<string, unknown>} Input
 */

/**
 * A key pressed
 * @param {string} part - The part
 * @param {string} key - The key value
 * @param {Readonly<Record<string, unknown>>} more - Modifiers, the item, the time
 * @returns {Input} The input
 */
function keydown(part, key, more = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    item: null,
    key,
    metaKey: false,
    part,
    shiftKey: false,
    timeStamp: 0,
    type: 'keydown',
    ...more,
  }
}

/**
 * A click
 * @param {string} part - The part
 * @param {Key | null} item - Its item
 * @returns {Input} The input
 */
function click(part, item = null) {
  return { altKey: false, ctrlKey: false, item, metaKey: false, part, shiftKey: false, timeStamp: 0, type: 'click' }
}

/**
 * A pointer event
 * @param {string} type - Which
 * @param {string} part - The part
 * @param {Key | null} item - Its item
 * @param {number} x - `clientX`
 * @param {number} y - `clientY`
 * @returns {Input} The input
 */
function pointer(type, part, item, x, y) {
  return { button: 0, clientX: x, clientY: y, item, part, pointerId: 1, timeStamp: 0, type }
}

/**
 * A field as a key
 * @param {unknown} value - The field
 * @returns {Key} The key, or `''` if it is none
 */
function keyOf(value) {
  return typeof value === 'string' || typeof value === 'number' ? value : ''
}

/**
 * The window a host reads from a collection for an ask, as `arraySource` reads it
 * @param {readonly Key[]} keys - The collection
 * @param {Readonly<Record<string, unknown>>} ask - The ask
 * @returns {Input} The answer
 */
function answerFor(keys, ask) {
  const ranks = ask['ranks']
  const rows = Number(ask['rows'])
  const from = Array.isArray(ranks)
    ? Number(ranks[0])
    : Math.max(0, keys.indexOf(keyOf(ask['locate'])) - Math.floor(rows / 2))
  const to = Array.isArray(ranks) ? Number(ranks[1]) : from + rows
  return { count: keys.length, from, id: ask['id'], keys: keys.slice(from, to), type: 'answer' }
}

const WORDS = [
  'apple',
  'apricot',
  'banana',
  'blueberry',
  'cherry',
  'Éclair',
  'fig',
  'grape',
  'kiwi',
  'lemon',
  'lime',
  'mango',
  'Ünder',
  'ΣΟΦΙΑΣ',
  'İstanbul',
  'ǅemal',
  '𐐀𐐨𐐯',
]

/**
 * A collection's keys, some strings, some numbers
 * @param {Random} pick - Choices
 * @returns {Key[]} The keys
 */
function collection(pick) {
  const count = pick.int(45)
  const numeric = pick.chance(25)
  return Array.from({ length: count }, (_, index) => (numeric ? index * 7 + 1 : `k${String(index)}`))
}

/**
 * Effects as records
 * @param {unknown} effects - Effects, as a step gives them
 * @returns {Readonly<Record<string, unknown>>[]} The records
 */
function asRecords(effects) {
  return Array.isArray(effects) ? effects.filter((effect) => isRecord(effect)) : []
}

/**
 * A run of a leaf, its inputs chosen as it goes from what the widget did with the ones before
 * @param {AnyLeaf} widget - The reference
 * @param {unknown} props - Its props
 * @param {number} length - How many inputs
 * @param {(effects: readonly Readonly<Record<string, unknown>>[]) => void} react - Hears each result's effects
 * @param {() => unknown} choose - The next input
 * @returns {LeafRun} The run
 */
function leafRun(widget, props, length, react, choose) {
  let [state, effects] = widget.init(props)
  react(asRecords(effects))
  /** @type {unknown[]} */
  const inputs = []
  for (let at = 0; at < length; at += 1) {
    const input = choose()
    inputs.push(input)
    ;[state, effects] = widget.step(state, input)
    react(asRecords(effects))
  }
  return { inputs, props }
}

/**
 * The environment of one random run of the list or the reorderable list: the collection, the asks not answered,
 * the changes and moves made, and a press under way
 * @param {Random} pick - Choices
 * @param {boolean} reorder - Whether it is the reorderable list
 * @returns {Readonly<{ props: unknown, react: (effects: readonly Readonly<Record<string, unknown>>[]) => void, choose: () => unknown }>}
 *   The first props, what hears the effects, and the next input
 */
function listEnvironment(pick, reorder) {
  let keys = collection(pick)
  let props = {
    focusable: pick.chance(80),
    label: 'List',
    rows: 2 + pick.int(6),
    selected: pick.chance(40) ? { value: keys.length > 0 && pick.chance(50) ? pick.pick(keys) : null } : null,
    shown: pick.chance(85),
    source: 'items',
    ...(reorder ? { dragDistance: pick.int(8), keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown' } : {}),
  }
  const first = props
  /** @type {Readonly<Record<string, unknown>>[]} */
  let asks = []
  /** @type {number[]} */
  const changes = []
  /** @type {Readonly<Record<string, unknown>>[]} */
  const moves = []
  /** @type {Readonly<{ x: number, y: number, item: Key }> | null} */
  let pressed = null
  /**
   * @param {readonly Readonly<Record<string, unknown>>[]} effects - A result's effects
   * @returns {void}
   */
  const react = (effects) => {
    for (const effect of effects) {
      if (effect['type'] === 'ask') {
        asks.push(effect)
      } else if (effect['type'] === 'change') {
        changes.push(Number(effect['id']))
      } else if (effect['type'] === 'move') {
        moves.push(effect)
      }
    }
  }
  /**
   * The next drag input: a press, a move over an option, or the release
   * @returns {Input} The input
   */
  const drag = () => {
    if (pressed === null) {
      const item = pick.pick(keys)
      pressed = { item, x: 10, y: 10 * keys.indexOf(item) }
      return pointer('pointerdown', 'option', item, pressed.x, pressed.y)
    }
    if (pick.chance(75)) {
      pressed = { item: pressed.item, x: pressed.x + pick.int(5), y: pressed.y + pick.int(9) - 2 }
      return pointer('pointermove', pick.chance(90) ? 'option' : 'root', pick.pick(keys), pressed.x, pressed.y)
    }
    const released = pointer(
      pick.chance(80) ? 'pointerup' : 'pointercancel',
      'option',
      pressed.item,
      pressed.x,
      pressed.y,
    )
    pressed = null
    return released
  }
  /**
   * The host's word on the oldest move: confirmed (the collection then has it), or refused
   * @param {Readonly<Record<string, unknown>>} move - The move
   * @returns {Input} The input
   */
  const settle = (move) => {
    if (!pick.chance(70)) {
      return { id: move['id'], type: 'refused' }
    }
    const item = keyOf(move['item'])
    const target = keyOf(move['target'])
    if (keys.includes(item) && keys.includes(target) && item !== target) {
      const without = keys.filter((key) => key !== item)
      const place = without.indexOf(target) + (move['after'] === true ? 1 : 0)
      keys = [...without.slice(0, place), item, ...without.slice(place)]
    }
    return { id: move['id'], type: 'confirmed' }
  }
  /**
   * The next input
   * @returns {unknown} It
   */
  const choose = () => {
    const roll = pick.int(100)
    if (asks.length > 0 && roll < 30) {
      const ask = pick.chance(70) ? asks.at(-1) : pick.pick(asks)
      asks = asks.filter((one) => one !== ask)
      return answerFor(keys, ask ?? {})
    }
    if (roll < 33 && keys.length > 1) {
      const from = pick.int(keys.length)
      const to = pick.int(keys.length)
      const swapped = keys.map((key, index) =>
        index === from ? (keys[to] ?? key) : index === to ? (keys[from] ?? key) : key,
      )
      keys = pick.chance(30) ? swapped.filter((_, index) => index !== from) : swapped
      return { type: 'changed' }
    }
    if (roll < 58) {
      const key = pick.pick([
        'ArrowDown',
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        'PageDown',
        'PageUp',
        'Enter',
        ' ',
        'Escape',
        'a',
      ])
      return keydown('root', key, { altKey: pick.chance(reorder ? 25 : 5), ctrlKey: pick.chance(3) })
    }
    if (roll < 64) {
      return click(
        pick.chance(85) ? 'option' : 'root',
        keys.length > 0 && pick.chance(90) ? pick.pick(keys) : 'nowhere',
      )
    }
    if (roll < 68) {
      return { item: null, offset: pick.int(1200) - 50, part: 'root', timeStamp: 0, type: 'scroll' }
    }
    if (roll < 70) {
      return { item: keys[0] ?? null, part: 'option', size: 20 + pick.int(10), timeStamp: 0, type: 'measured' }
    }
    if (roll < 74) {
      const selected = pick.chance(50) ? { value: keys.length > 0 ? pick.pick(keys) : null } : null
      props = {
        ...props,
        rows: pick.chance(30) ? 2 + pick.int(6) : props.rows,
        selected: pick.chance(50) ? props.selected : selected,
        shown: pick.chance(20) ? !props.shown : props.shown,
      }
      return { props, type: 'props' }
    }
    if (roll < 77) {
      return { id: changes.length > 0 && pick.chance(80) ? pick.pick(changes) : 99, type: 'refused' }
    }
    if (reorder && roll < 92 && keys.length > 0) {
      return drag()
    }
    const move = moves.shift()
    return reorder && move !== undefined ? settle(move) : { type: 'changed' }
  }
  return { choose, props: first, react }
}

/**
 * Makes random runs of the list or the reorderable list: answers to its asks (the latest, or one it no longer waits
 * for), the collection changing, keys, clicks, scrolling, new props, and for the reorderable list drags and the host's
 * word on moves
 * @param {AnyLeaf} widget - The reference
 * @param {boolean} reorder - Whether it is the reorderable list
 * @param {number} seed - The seed
 * @param {number} runs - How many runs
 * @param {number} length - Inputs per run
 * @returns {LeafRun[]} The runs
 */
function listRuns(widget, reorder, seed, runs, length) {
  const pick = random(seed)
  return Array.from({ length: runs }, () => {
    const environment = listEnvironment(pick, reorder)
    return leafRun(widget, environment.props, length, environment.react, environment.choose)
  })
}

/**
 * The environment of one random run of the menu: its items, the wakes it asked for, and the time
 * @param {Random} pick - Choices
 * @returns {Readonly<{ props: unknown, react: (effects: readonly Readonly<Record<string, unknown>>[]) => void, choose: () => unknown }>}
 *   The first props, what hears the effects, and the next input
 */
function menuEnvironment(pick) {
  /**
   * Some items of a few words, some disabled
   * @returns {Readonly<{ disabled: boolean, key: Key, text: string }>[]} The items
   */
  const itemsOf = () =>
    Array.from({ length: pick.int(7) }, (_, index) => ({
      disabled: pick.chance(20),
      key: pick.chance(30) ? index : `i${String(index)}`,
      text: pick.pick(WORDS),
    }))
  let items = itemsOf()
  /** @type {number[]} */
  const wakes = []
  let now = 0
  /**
   * @param {readonly Readonly<Record<string, unknown>>[]} effects - A result's effects
   * @returns {void}
   */
  const react = (effects) => {
    for (const effect of effects) {
      if (effect['type'] === 'wake') {
        wakes.push(Number(effect['at']))
      }
    }
  }
  /**
   * The next input
   * @returns {unknown} It
   */
  const choose = () => {
    now += pick.chance(70) ? pick.int(300) : pick.int(2000)
    const roll = pick.int(100)
    const item = items.length > 0 && pick.chance(85) ? pick.pick(items).key : 'none'
    const wake = wakes.shift()
    if (wake !== undefined && roll < 15) {
      now = Math.max(now, wake)
      return { now, type: 'time' }
    }
    if (roll < 30) {
      return click(pick.chance(50) ? 'button' : 'item', item)
    }
    if (roll < 90) {
      const key = pick.pick([
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        'Escape',
        'Tab',
        'Enter',
        ' ',
        'a',
        'b',
        'c',
        'l',
        'm',
        'é',
        'ü',
        'É',
        'Σ',
        'σ',
        'İ',
        'i',
        'ǆ',
        '𐐀',
        '\u2028',
      ])
      return keydown(pick.chance(80) ? 'item' : 'button', key, { ctrlKey: pick.chance(5), item, timeStamp: now })
    }
    items = pick.chance(50) ? itemsOf() : items
    return { props: { items, label: 'Menu' }, type: 'props' }
  }
  return { choose, props: { items, label: 'Menu' }, react }
}

/**
 * Makes random runs of the menu: items of a few words (some not ASCII), keys on the button and the items, typeahead
 * at times close together and far apart, the wakes it asks for, clicks, and new items
 * @param {AnyLeaf} widget - The reference
 * @param {number} seed - The seed
 * @param {number} runs - How many runs
 * @param {number} length - Inputs per run
 * @returns {LeafRun[]} The runs
 */
function menuRuns(widget, seed, runs, length) {
  const pick = random(seed)
  return Array.from({ length: runs }, () => {
    const environment = menuEnvironment(pick)
    return leafRun(widget, environment.props, length, environment.react, environment.choose)
  })
}

/**
 * One random run of a composite holding a select (the select itself, or a dialog around one)
 * @param {AnyWidget} widget - The reference
 * @param {Path} at - The select's path in the widget
 * @param {boolean} isDialog - Whether it is the dialog
 * @param {Random} pick - Choices
 * @param {number} length - Deliveries in the run
 * @returns {CompositeRun} The run
 */
function selectRun(widget, at, isDialog, pick, length) {
  const keys = collection(pick)
  /**
   * The select's props
   * @param {boolean} controlled - Whether the app gives the value
   * @returns {Readonly<Record<string, unknown>>} The props
   */
  const selectProps = (controlled) => ({
    label: 'Fruit',
    placeholder: 'Choose',
    rows: 2 + pick.int(5),
    source: 'fruit',
    value: controlled ? { value: keys.length > 0 && pick.chance(70) ? pick.pick(keys) : null } : null,
  })
  let content = selectProps(pick.chance(40))
  let open = pick.chance(70)
  const propsNow = () => (isDialog ? { closeLabel: 'Close', content, open, title: 'Pick' } : content)
  const props = propsNow()
  /** @type {{ path: Path, input: unknown }[]} */
  const deliveries = []
  /** @type {{ from: Path, ask: Readonly<Record<string, unknown>> }[]} */
  let asks = []
  /** @type {{ from: Path, id: number }[]} */
  const changes = []
  /**
   * @param {readonly Out[]} outs - What reached the host
   * @returns {void}
   */
  const react = (outs) => {
    for (const out of outs) {
      const [effect] = asRecords([out.effect])
      if (effect?.['type'] === 'ask') {
        asks.push({ ask: effect, from: out.from })
      } else if (effect?.['type'] === 'change') {
        changes.push({ from: out.from, id: Number(effect['id']) })
      }
    }
  }
  /**
   * The next delivery
   * @returns {{ path: Path, input: unknown }} It
   */
  const choose = () => {
    const roll = pick.int(100)
    if (asks.length > 0 && roll < 25) {
      const one = pick.chance(70) ? asks.at(-1) : pick.pick(asks)
      asks = asks.filter((ask) => ask !== one)
      return { input: answerFor(keys, one?.ask ?? {}), path: one?.from ?? [] }
    }
    if (roll < 55) {
      const key = pick.pick(['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Home', 'End', 'Tab', 'a'])
      return { input: keydown('trigger', key, { altKey: pick.chance(10) }), path: at }
    }
    if (roll < 65) {
      return { input: click('trigger'), path: at }
    }
    if (roll < 68) {
      return { input: { item: null, part: 'trigger', timeStamp: 0, type: 'blur' }, path: at }
    }
    if (roll < 78) {
      const item = keys.length > 0 && pick.chance(90) ? pick.pick(keys) : 'none'
      const input = pick.chance(20)
        ? { button: 0, item, part: 'option', timeStamp: 0, type: 'mousedown' }
        : click('option', item)
      return { input, path: [...at, 'list'] }
    }
    if (roll < 85) {
      content = pick.chance(60) ? content : selectProps(pick.chance(50))
      open = isDialog && pick.chance(30) ? !open : open
      return { input: { props: propsNow(), type: 'props' }, path: [] }
    }
    const change = changes.length > 0 ? pick.pick(changes) : null
    if (roll < 90 && change !== null) {
      return { input: { id: change.id, type: 'refused' }, path: change.from }
    }
    if (isDialog && roll < 96) {
      return pick.chance(50) ? { input: click('close'), path: [] } : { input: keydown('root', 'Escape'), path: [] }
    }
    return {
      input: { item: null, offset: pick.int(300), part: 'root', timeStamp: 0, type: 'scroll' },
      path: [...at, 'list'],
    }
  }
  let [state, outs] = start(widget, props)
  react(outs)
  for (let step = 0; step < length; step += 1) {
    const delivery = choose()
    deliveries.push(delivery)
    ;[state, outs] = deliver(widget, state, delivery.path, delivery.input)
    react(outs)
  }
  return { deliveries, props }
}

/**
 * Makes random runs of a composite holding a select (the select itself, or a dialog around one): keys, clicks and
 * blur on the trigger, options clicked, answers to the list's asks (latest or stale), new props, refusals, and for a
 * dialog its close button, Escape, and opening and closing
 * @param {AnyWidget} widget - The reference
 * @param {Path} at - The select's path in the widget
 * @param {boolean} isDialog - Whether it is the dialog
 * @param {number} seed - The seed
 * @param {number} runs - How many runs
 * @param {number} length - Deliveries per run
 * @returns {CompositeRun[]} The runs
 */
function selectRuns(widget, at, isDialog, seed, runs, length) {
  const pick = random(seed)
  return Array.from({ length: runs }, () => selectRun(widget, at, isDialog, pick, length))
}

export { answerFor, canon, click, keydown, listRuns, LUA_DRIVER, menuRuns, pointer, selectRuns, toLua }
