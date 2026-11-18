import { afterEach, describe, expect, test } from 'bun:test'

import { arraySource } from '@pterror/interact-core'
import {
  collectionOf,
  drawsAsTheDomRenderer,
  FRUIT,
  settled,
  takesItemsInAForm,
  violations,
} from '@pterror/interact-core/test-components'

import { compiled, load, MAJOR } from './test-svelte.js'

/** @import { Mounting } from '@pterror/interact-core/test-components' */

const client = await load(await compiled('client'))
const svelte = await import('svelte')
const STATE = new URL('../node_modules/.compiled/client/state.svelte.js', import.meta.url).pathname
const stateModule = MAJOR >= 5 ? await load(STATE) : {}
const makeState = stateModule['reactive']

/**
 * Props the component reads again when they change: Svelte 5's state, or (Svelte 4, whose props change by `$set`) as
 * they are
 * @param {Readonly<Record<string, unknown>>} initial - The props
 * @returns {Record<string, unknown>} The props
 */
function reactive(initial) {
  /** @type {unknown} */
  const props = isCallback(makeState) ? makeState(initial) : { ...initial }
  return isProps(props) ? props : { ...initial }
}

/**
 * Whether a value is a record of props
 * @param {unknown} value - The value
 * @returns {value is Record<string, unknown>} Whether it is an object
 */
function isProps(value) {
  return typeof value === 'object' && value !== null
}

/**
 * Whether a value is a function
 * @param {unknown} value - The value
 * @returns {value is (...args: readonly unknown[]) => unknown} Whether it is
 */
function isCallback(value) {
  return typeof value === 'function'
}

/**
 * A change as a Svelte 4 event's detail carries it
 * @param {unknown} detail - The detail
 * @returns {Readonly<{ value: unknown, refuse: () => void }>} The value, and refusing it
 */
function changeOf(detail) {
  const value = typeof detail === 'object' && detail !== null && 'value' in detail ? detail.value : null
  const change = typeof detail === 'object' && detail !== null && 'change' in detail ? detail.change : null
  const refuse = typeof change === 'object' && change !== null && 'refuse' in change ? change.refuse : null
  return {
    refuse: () => {
      if (isCallback(refuse)) {
        refuse()
      }
    },
    value,
  }
}
const SELECT = { disabled: false, label: 'Fruit', placeholder: 'Choose a fruit', rows: 4, source: 'fruit' }
const OF = { content: client['select'], initialFocus: ['content', 'trigger'] }
/** @type {readonly ('select' | 'dialog')[]} */
const KINDS = ['select', 'dialog']
/** @type {readonly ('app' | 'own')[]} */
const MODES = ['app', 'own']

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * Presses a key on an element
 * @param {Element | null} element - The element
 * @param {string} key - The key value
 * @returns {void}
 */
function press(element, key) {
  element?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

/**
 * A container in the document
 * @returns {HTMLElement} It
 */
function containerIn() {
  const container = document.createElement('div')
  document.body.append(container)
  return container
}

/**
 * Whether a compiled module's export is a component: a function, in either syntax
 * @param {unknown} value - The export
 * @returns {value is import('svelte').Component<Record<string, unknown>> & (new (options: Readonly<Record<string, unknown>>) => Readonly<{ $on: (event: string, heard: (event: Readonly<{ detail: unknown }>) => void) => void, $set: (props: Readonly<Record<string, unknown>>) => void, $destroy: () => void }>)} Whether it is
 */
function isComponent(value) {
  return typeof value === 'function'
}

/**
 * Mounts a component, as the Svelte the tests run on does
 * @param {unknown} Component - The component
 * @param {HTMLElement} target - Where
 * @param {Record<string, unknown>} props - Its props
 * @param {boolean} hydrating - Whether to hydrate what the target holds
 * @returns {Readonly<{ on: (event: string, heard: (detail: unknown) => void) => void, set: (props: Readonly<Record<string, unknown>>) => void, stop: () => void }>}
 *   Hearing its events (Svelte 4's), setting its props, and taking it down
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Svelte 5 takes new props as assignments to its state
function mount(Component, target, props, hydrating = false) {
  if (!isComponent(Component)) {
    throw new TypeError('Not a component')
  }
  if (MAJOR >= 5) {
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- Svelte types a mounted component's exports as any
    const mounted = hydrating
      ? svelte.hydrate(Component, { props, target })
      : svelte.mount(Component, { props, target })
    return {
      on: () => undefined,
      set: (next) => {
        Object.assign(props, next)
      },
      stop: () => {
        // oxlint-disable-next-line typescript/no-unsafe-argument -- Svelte types a mounted component's exports as any
        void svelte.unmount(mounted)
      },
    }
  }
  const legacy = new Component({ hydrate: hydrating, props, target })
  return {
    on: (event, heard) => {
      legacy.$on(event, (fired) => {
        heard(fired.detail)
      })
    },
    set: (next) => {
      legacy.$set(next)
    },
    stop: () => {
      legacy.$destroy()
    },
  }
}

/**
 * Hears a change from Svelte 5's callback (Svelte 4's comes as an event)
 * @param {(value: unknown, change: import('./run.js').Change) => void} heard - What hears it
 * @returns {(value: unknown, change: import('./run.js').Change) => void} The listener
 */
function onChange(heard) {
  return (value, change) => {
    if (MAJOR >= 5) {
      heard(value, change)
    }
  }
}

const framework = {
  mount: (/** @type {Mounting} */ mounting) => {
    const { mode, naming, sources } = mounting
    /** @type {Record<string, unknown>} */
    const select = {
      ...SELECT,
      ...(mode === 'app'
        ? { value: mounting.value }
        : mounting.kind === 'select'
          ? { value: mounting.value }
          : { defaultValue: mounting.value }),
    }
    /** @type {ReturnType<typeof mount> | null} */
    let mounted = null
    const selectChanged = (/** @type {unknown} */ value) => {
      mounting.changed('select', value)
      if (mode === 'app' && mounting.kind === 'dialog') {
        mounted?.set({ content: { ...select, onchange: selectChanged, value } })
      }
    }
    if (mounting.kind === 'select') {
      const props = reactive({
        ...select,
        naming,
        ...collectionOf(mounting),
        ...(MAJOR >= 5 ? { onchange: selectChanged } : {}),
      })
      const made = mount(client['Select'], mounting.container, props)
      made.on('change', (detail) => {
        selectChanged(changeOf(detail).value)
      })
      return made.stop
    }
    const props = reactive({
      closeLabel: 'Close',
      ignoreOutside: false,
      content: { ...select, onchange: selectChanged },
      naming,
      of: OF,
      open: mounting.open,
      sources,
      title: 'Pick a fruit',
      ...(MAJOR >= 5
        ? {
            onchange: (/** @type {unknown} */ value) => {
              mounting.changed('dialog', value)
            },
          }
        : {}),
    })
    const made = mount(client['Dialog'], mounting.container, props)
    mounted = made
    made.on('change', (detail) => {
      mounting.changed('dialog', changeOf(detail).value)
    })
    return made.stop
  },
  settle: settled,
}

describe(`the Svelte ${String(MAJOR)} components`, () => {
  for (const kind of KINDS) {
    for (const mode of MODES) {
      test(`the ${kind}, its value ${mode === 'app' ? "the app's" : 'its own'}, draws as the DOM renderer does`, async () => {
        await drawsAsTheDomRenderer(framework, kind, mode)
      })
    }
  }

  test('the select takes its items in place of a source, and is a field of its form', async () => {
    await takesItemsInAForm(framework, true)
  })

  test('render on a server, and hydrate to the same DOM, which then runs', async () => {
    const props = {
      closeLabel: 'Close',
      ignoreOutside: false,
      content: { ...SELECT, defaultValue: 'Banana' },
      of: OF,
      open: true,
      sources: { fruit: arraySource(FRUIT) },
      title: 'Pick a fruit',
    }
    const rendering = Bun.spawn(
      [process.execPath, '--conditions', 'node', new URL('test-server.js', import.meta.url).pathname],
      { stderr: 'inherit', stdout: 'pipe' },
    )
    const html = await new Response(rendering.stdout).text()
    await rendering.exited
    const container = containerIn()
    container.innerHTML = html
    const trigger = container.querySelector('[role=combobox]')
    expect([container.querySelector('[role=dialog]')?.hasAttribute('hidden'), trigger?.textContent]).toEqual([
      false,
      'Banana',
    ])
    const id = trigger?.id ?? ''
    const made = mount(client['Dialog'], container, reactive(props), true)
    await settled()
    expect(container.querySelector('[role=combobox]')).toBe(trigger)
    expect(container.querySelectorAll('[role=combobox]').length).toBe(1)
    expect(document.activeElement).toBe(trigger)
    expect(trigger?.id).toBe(id)
    press(trigger, 'ArrowDown')
    await settled()
    expect(trigger?.getAttribute('aria-activedescendant')).toBe(
      [...container.querySelectorAll('[role=option]')].find((option) => option.textContent === 'Banana')?.id,
    )
    expect(await violations(container)).toEqual([])
    made.stop()
  })

  test('draw a part the app replaces with the attributes and contents it is given, and run it', async () => {
    const container = containerIn()
    /** @type {unknown[]} */
    const heard = []
    const parts = await load(
      STATE.replace(/state\.svelte\.js$/u, MAJOR >= 5 ? 'test-parts.svelte.js' : 'legacy/test-parts.svelte.js'),
    )
    const made = mount(parts['default'], container, {
      onchange: (/** @type {unknown} */ value) => {
        heard.push(value)
      },
      sources: { fruit: arraySource(FRUIT) },
    })
    made.on('change', (detail) => {
      heard.push(changeOf(detail).value)
    })
    await settled()
    const trigger = container.querySelector('[role=combobox]')
    press(trigger, 'ArrowDown')
    await settled()
    const options = [...container.querySelectorAll('ul[role=listbox] > li[role=option]')].filter(
      (option) => option instanceof HTMLElement,
    )
    expect(options.map((option) => [option.dataset['key'], option.innerHTML.replaceAll(/<!--[^>]*-->/gu, '')])).toEqual(
      [
        ['Apple', '<b>Apple</b>'],
        ['Banana', '<b>Banana</b>'],
        ['Cherry', '<b>Cherry</b>'],
        ['Date', '<b>Date</b>'],
      ],
    )
    expect(await violations(container)).toEqual([])
    options[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settled()
    expect([heard, trigger?.textContent]).toEqual([['Cherry'], 'Cherry'])
    made.stop()
  })

  test.each([true, false])('undo a change the app refuses, the value bound: %p', async (bound) => {
    const container = containerIn()
    let value = 'Apple'
    /** @type {Record<string, unknown>} */
    const props = reactive({
      ...SELECT,
      ...(bound
        ? {
            get value() {
              return value
            },
            set value(next) {
              value = typeof next === 'string' ? next : ''
            },
          }
        : {}),
      onchange: onChange((_value, change) => {
        setTimeout(change.refuse, 20)
      }),
      sources: { fruit: arraySource(FRUIT) },
    })
    const made = mount(client['Select'], container, props)
    made.on('change', (detail) => {
      setTimeout(changeOf(detail).refuse, 20)
    })
    await settled()
    const trigger = container.querySelector('[role=combobox]')
    press(trigger, 'ArrowDown')
    await settled()
    press(trigger, 'ArrowDown')
    press(trigger, 'ArrowDown')
    press(trigger, 'Enter')
    await settled()
    expect(trigger?.textContent).toBe('Cherry')
    await Bun.sleep(40)
    expect(trigger?.textContent).toBe(bound ? 'Apple' : 'Choose a fruit')
    made.stop()
  })
})
