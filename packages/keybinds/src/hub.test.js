/**
 * @import { Mock } from 'bun:test'
 * @import { BindingOverrides, Command, Context } from './command.js'
 * @import { CommandDefinition } from './hub-commands.js'
 * @import { CommandHubOptions } from './hub-options.js'
 */

import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'

import { KeybindCheatsheet } from './cheatsheet.js'
import { ContextMenu } from './components/context-menu.js'
import { KeybindSettings } from './components/settings.js'
import { CommandHub } from './hub.js'
import { CommandPalette } from './palette.js'
import { kbd } from './test-helpers.js'
import { ALL } from './test-inputs.js'

const COMPONENTS = {
  cheatsheet: KeybindCheatsheet,
  menu: ContextMenu,
  palette: CommandPalette,
  settings: KeybindSettings,
}
const ONCE = 1
const TWICE = 2
const FIRST = 0

/** @type {(() => void)[]} */
const cleanups = []

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * A command bound to Ctrl+S that notes each run
 * @param {Partial<Command>} [extra] - Fields to change
 * @returns {Command & Readonly<{ execute: Mock<() => undefined> }>} The command
 */
function save(extra = {}) {
  return { id: 'save', keys: ['ctrl+s'], label: 'Save', ...extra, execute: mock(() => undefined) }
}

/**
 * A hub listening on an element of its own, destroyed when the test ends
 * @param {Partial<CommandHubOptions<Command, Context>>} [options] - More options
 * @returns {Readonly<{ hub: CommandHub, target: HTMLElement }>} The hub, and where it listens
 */
function hubOn(options = {}) {
  const target = document.createElement('div')
  const hub = new CommandHub({ ...ALL, context: () => ({}), listen: { target }, storageKey: 't', ...options })
  cleanups.push(() => {
    hub.destroy()
  })
  return { hub, target }
}

/**
 * A hub with every component, made in a host in the page
 * @returns {CommandHub} The hub
 */
function withComponents() {
  const host = document.createElement('div')
  document.body.append(host)
  cleanups.push(() => {
    host.remove()
  })
  return hubOn({ components: COMPONENTS, host }).hub
}

/**
 * Ctrl+S going down on a target
 * @param {EventTarget} target - Where
 * @returns {void}
 */
function pressSave(target) {
  target.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
}

/**
 * Storage kept in a record of its own, by scope
 * @param {Readonly<Record<string, BindingOverrides>>} [initial] - What's kept to begin with
 * @returns {Readonly<{ kept: Record<string, BindingOverrides>, storage: NonNullable<CommandHubOptions<Command, Context>['storage']> }>}
 *   The record, and the storage
 */
function keptIn(initial = {}) {
  /** @type {Record<string, BindingOverrides>} */
  const kept = { ...initial }
  return {
    kept,
    storage: (scope) => ({
      load: () => kept[scope] ?? {},
      save: (overrides) => {
        kept[scope] = overrides
      },
    }),
  }
}

/**
 * The messages of the errors a hub reports, each prevented from going further
 * @param {EventTarget} hub - The hub
 * @returns {readonly string[]} The messages, as they're reported
 */
function reportsOf(hub) {
  /** @type {string[]} */
  const reported = []
  hub.addEventListener('error', (event) => {
    event.preventDefault()
    reported.push(event instanceof ErrorEvent ? event.message : '')
  })
  return reported
}

describe('a hub', () => {
  test('keeps rebindings in custom storage, per scope', () => {
    const { kept, storage } = keptIn()
    const { hub } = hubOn({ storage })
    hub.setSource('a', () => [save()])
    hub.setScope('game')
    hub.refresh()
    hub.store?.save({ save: { keys: ['ctrl+shift+s'] } })
    expect(kept).toEqual({ game: { save: { keys: ['ctrl+shift+s'] } } })
    expect(localStorage).toHaveLength(FIRST)
  })

  test('runs commands from every source on their keys, the first source winning an id', () => {
    const { hub, target } = hubOn()
    const mine = save()
    const theirs = save({ label: 'Other save' })
    hub.setSource('a', () => [mine])
    hub.setSource('b', () => [theirs])
    hub.refresh()
    pressSave(target)
    expect(mine.execute).toHaveBeenCalledTimes(ONCE)
    expect(theirs.execute).not.toHaveBeenCalled()
    expect(hub.get('save')?.label).toBe('Save')
  })

  test("takes a person's rebinding at once", () => {
    const { hub, target } = hubOn()
    const command = save()
    hub.setSource('a', () => [command])
    hub.refresh()
    hub.store?.save({ save: { keys: ['ctrl+d'] } })
    pressSave(target)
    target.dispatchEvent(kbd('keydown', { code: 'KeyD', ctrlKey: true, key: 'd' }))
    expect(command.execute).toHaveBeenCalledTimes(ONCE)
    expect(hub.bindingsFor('save', 'keys')).toEqual(['Ctrl+D'])
  })

  test("keeps a person's rebindings per scope", () => {
    const { hub } = hubOn()
    hub.setSource('a', () => [save()])
    hub.refresh()
    hub.store?.save({ save: { keys: ['ctrl+d'] } })
    hub.setScope('other')
    hub.refresh()
    expect(hub.bindingsFor('save', 'keys')).toEqual(['Ctrl+S'])
  })
})

describe('definitions that are not commands', () => {
  test('become commands through adapt', () => {
    const target = document.createElement('div')
    const ran = mock(() => undefined)
    /** @type {CommandHub<Readonly<{ id: string, keys: readonly string[], label: string, run: () => void }>>} */
    const hub = new CommandHub({
      ...ALL,
      adapt: (tool) => ({ ...tool, execute: tool.run }),
      context: () => ({}),
      listen: { target },
    })
    hub.setSource('a', () => [{ id: 'save', keys: ['ctrl+s'], label: 'Save', run: ran }])
    hub.refresh()
    pressSave(target)
    expect([hub.run('save'), ran.mock.calls.length, hub.get('save')?.run]).toEqual([true, TWICE, ran])
    hub.destroy()
  })

  test('without adapt, are left out and reported when they have nothing to run', () => {
    /** @type {CommandHub<CommandDefinition>} */
    const hub = new CommandHub({ ...ALL, context: () => ({}) })
    const reported = reportsOf(hub)
    hub.setSource('a', () => [{ id: 'save', label: 'Save' }])
    hub.refresh()
    expect([hub.run('save'), reported]).toEqual([false, ['keybinds: leaving out "save"']])
  })
})

describe('what a hub leaves out', () => {
  test('one unreadable binding: the others still work, and it is reported', () => {
    const { hub, target } = hubOn()
    const command = save()
    const reported = reportsOf(hub)
    hub.setSource('a', () => [save({ id: 'broken', keys: ['ctrl+notakey'] }), command])
    hub.refresh()
    pressSave(target)
    expect(command.execute).toHaveBeenCalledTimes(ONCE)
    expect(hub.bindingsFor('broken', 'keys')).toEqual([])
    expect(reported).toEqual(['keybinds: dropping the bindings of "broken"'])
  })

  test('a source that throws: reported to reportError() when nobody prevents it', () => {
    const { hub } = hubOn()
    const reported = spyOn(globalThis, 'reportError').mockReturnValue(undefined)
    hub.setSource('a', () => {
      throw new Error('gone')
    })
    hub.setSource('b', () => [save()])
    hub.refresh()
    expect(hub.all().map(({ id }) => id)).toEqual(['save'])
    expect(reported).toHaveBeenCalledTimes(ONCE)
    reported.mockRestore()
  })
})

describe('a hub with a host', () => {
  test('makes the components and keeps them in step', () => {
    const hub = withComponents()
    hub.setSource('a', () => [save(), save({ hidden: true, id: 'secret', label: 'Secret' })])
    hub.refresh()
    expect(hub.palette?.commands.map(({ id }) => id)).toEqual(['save'])
    expect(hub.settings?.store).toBe(hub.store)
    expect(document.querySelectorAll('[data-keybinds]')).toHaveLength(Object.keys(COMPONENTS).length)
  })
})

describe('the context a hub gives its components', () => {
  test('keeps an open menu or palette in the context it was opened in', () => {
    const hub = withComponents()
    let editing = true
    hub.addContext(() => ({ editing }))
    hub.setSource('a', () => [save({ menu: 'text' })])
    hub.refresh()
    hub.openMenu('text', FIRST, FIRST)
    hub.openPalette()
    editing = false
    hub.syncContext()
    expect([hub.menu?.context, hub.palette?.context, hub.cheatsheet?.context]).toEqual([
      { editing: true },
      { editing: true },
      { editing: false },
    ])
  })

  test('gives a menu the context again once it closes', () => {
    const hub = withComponents()
    let editing = true
    hub.addContext(() => ({ editing }))
    hub.refresh()
    hub.openMenu('text', FIRST, FIRST)
    editing = false
    hub.menu?.removeAttribute('open')
    hub.syncContext()
    expect(hub.menu?.context).toEqual({ editing: false })
  })
})

describe('a hub with every input', () => {
  test('answers whether a command is held', () => {
    const { hub, target } = hubOn()
    hub.setSource('a', () => [{ execute: () => undefined, id: 'fwd', keys: ['w'], label: 'Forward' }])
    hub.refresh()
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w' }))
    expect(hub.held('fwd')).toBe(true)
    hub.destroy()
    expect(hub.held('fwd')).toBe(false)
  })

  test('shows gamepad bindings', () => {
    const { hub } = hubOn()
    hub.setSource('a', () => [{ execute: () => undefined, gamepad: ['a'], id: 'jump', label: 'Jump' }])
    hub.refresh()
    expect(hub.bindingsFor('jump', 'gamepad')).toEqual(['A'])
  })

  test('rebinds and reads axes', () => {
    const { storage } = keptIn({ global: { strafe: { axes: ['keys:j/l'] } } })
    const { hub, target } = hubOn({ storage })
    hub.setAxes('game', () => [{ axes: ['keys:a/d'], id: 'strafe', label: 'Strafe' }])
    hub.refresh()
    expect(hub.bindingsFor('strafe', 'axes')).toEqual(['J / L'])
    target.dispatchEvent(kbd('keydown', { code: 'KeyL', key: 'l' }))
    expect(hub.axis('strafe').position).toBe(ONCE)
  })
})
