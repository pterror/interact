/**
 * A component's state as extensions make it: facets that combine what extensions give into one value, state fields
 * that change only through transactions, and effects that transactions carry. The core knows none of the features
 * built on it; each brings its own facets, fields and effects.
 */

/**
 * How early an extension's parts come among others of the same kind: in a facet's inputs, among input handlers, in a
 * pipeline's steps. Higher comes first; within a level, the order they were given in.
 * @typedef {'highest' | 'high' | 'default' | 'low' | 'lowest'} Level
 */

/**
 * One part of an extension: it puts itself into a configuration as it is built.
 * @typedef {Readonly<{ install: (into: Builder, level: number) => void }>} Part
 */

/**
 * What a component is configured with: a part, or any nesting of lists of them. The same part given twice counts once,
 * where it first comes, so extensions can each include what they depend on.
 * @typedef {Part | readonly Extension[]} Extension
 */

/**
 * What a transaction is asked for: its effects, and whether transaction filters see it (by default they do).
 * @typedef {Readonly<{ effects?: Effect<unknown> | readonly Effect<unknown>[], filter?: boolean }>} TransactionSpec
 */

/**
 * What a transaction filter does: given the effects asked for and the state they apply to, the effects to apply.
 * @typedef {(effects: readonly Effect<unknown>[], state: State) => readonly Effect<unknown>[]} TransactionFilter
 */

/** @type {readonly Level[]} */
const LEVELS = ['highest', 'high', 'default', 'low', 'lowest']
const DEFAULT_LEVEL = LEVELS.indexOf('default')

/**
 * What a configuration is built from, collected once when a state is first made: the fields, and for each facet the
 * inputs given to it, by level and order.
 */
class Builder {
  #order = 0
  /**
   * @readonly
   * @type {Set<object>}
   */
  #seen = new Set()
  /**
   * @readonly
   * @type {Map<object, (configuration: Configuration) => void>}
   */
  #facets = new Map()
  /**
   * @readonly
   * @type {Map<object, (state: State) => void>}
   */
  #fields = new Map()

  /**
   * Puts an extension in, once each part.
   * @param {Extension} extension - The extension
   * @param {number} level - Its level, as an index into `LEVELS`
   * @returns {void}
   */
  add(extension, level) {
    if ('install' in extension) {
      if (!this.#seen.has(extension)) {
        this.#seen.add(extension)
        extension.install(this, level)
      }
      return
    }
    for (const each of extension) {
      this.add(each, level)
    }
  }

  /**
   * The next place in the order parts were given in.
   * @returns {number} The place
   */
  next() {
    this.#order += 1
    return this.#order
  }

  /**
   * Notes a facet given an input, and how it combines its inputs once every part is in.
   * @param {object} facet - The facet
   * @param {(configuration: Configuration) => void} finish - Combines its inputs for the configuration
   * @returns {void}
   */
  facet(facet, finish) {
    this.#facets.set(facet, finish)
  }

  /**
   * Notes a field, and how a state settles its value.
   * @param {object} field - The field
   * @param {(state: State) => void} settle - Works out its value in a state
   * @returns {void}
   */
  field(field, settle) {
    this.#fields.set(field, settle)
  }

  /**
   * The configuration, with every facet's inputs combined.
   * @returns {Configuration} The configuration
   */
  done() {
    const configuration = new Configuration(this.#fields)
    for (const finish of this.#facets.values()) {
      finish(configuration)
    }
    return configuration
  }
}

/** What a set of extensions configures: which fields there are. Facets keep their combined values by it. */
class Configuration {
  /**
   * @readonly
   * @type {ReadonlyMap<object, (state: State) => void>}
   */
  #fields

  /** @param {ReadonlyMap<object, (state: State) => void>} fields - The fields, each with how a state settles it */
  constructor(fields) {
    this.#fields = fields
  }

  /**
   * Whether a field is configured.
   * @param {object} field - The field
   * @returns {boolean} Whether it is
   */
  has(field) {
    return this.#fields.has(field)
  }

  /**
   * Works out every field's value in a state.
   * @param {State} state - The state
   * @returns {void}
   */
  settle(state) {
    for (const settle of this.#fields.values()) {
      settle(state)
    }
  }
}

/**
 * A kind of change a transaction can carry, with a value of type `V`: "reveal item 7", "the selection moved". It means
 * nothing to the core, only to the extensions that send and handle it.
 * @template V
 */
class EffectType {
  /**
   * An effect of this type.
   * @param {V} value - Its value
   * @returns {Effect<V>} The effect
   */
  of(value) {
    return new Effect(this, value)
  }
}

/**
 * One change a transaction carries: its type and its value.
 * @template V
 */
class Effect {
  /**
   * @param {EffectType<V>} type - Its type
   * @param {V} value - Its value
   */
  constructor(type, value) {
    /** @readonly */
    this.type = type
    /** @readonly */
    this.value = value
  }

  /**
   * Whether it is of a type, so its value is that type's.
   * @template U
   * @param {EffectType<U>} type - The type
   * @returns {this is Effect<U>} Whether it is
   */
  is(type) {
    return Object.is(this.type, type)
  }
}

/**
 * A facet: a value extensions each give an input to, combined into one output for the configuration, in the order of
 * their level and then the order they were given in.
 * @template I, O
 */
class Facet {
  /**
   * @readonly
   * @type {(inputs: readonly I[]) => O}
   */
  #combine
  /**
   * The inputs given while a configuration is built, with their level and place.
   * @readonly
   * @type {WeakMap<Builder, Readonly<{ level: number, order: number, input: I }>[]>}
   */
  #given = new WeakMap()
  /**
   * @readonly
   * @type {WeakMap<Configuration, Readonly<{ output: O }>>}
   */
  #outputs = new WeakMap()

  /** @param {(inputs: readonly I[]) => O} combine - Makes the output from every input, in order */
  constructor(combine) {
    this.#combine = combine
  }

  /**
   * An extension giving this facet an input.
   * @param {I} input - The input
   * @returns {Part} The extension
   */
  of(input) {
    return {
      install: (into, level) => {
        const given = this.#given.get(into) ?? []
        this.#given.set(into, given)
        given.push({ input, level, order: into.next() })
        into.facet(this, (configuration) => {
          const ordered = given.toSorted((left, right) => left.level - right.level || left.order - right.order)
          this.#outputs.set(configuration, { output: this.#combine(ordered.map(({ input: each }) => each)) })
        })
      },
    }
  }

  /**
   * The output for a configuration: its inputs combined, or no inputs combined if none were given.
   * @param {Configuration} configuration - The configuration
   * @returns {O} The output
   */
  read(configuration) {
    const known = this.#outputs.get(configuration)
    if (known) {
      return known.output
    }
    const output = this.#combine([])
    this.#outputs.set(configuration, { output })
    return output
  }
}

/**
 * A state field: a value made when the state is, and changed only by transactions, each giving its new value from the
 * old one and the transaction. A field is an extension; including it is what puts it in the state.
 * @template V
 */
class Field {
  /**
   * @readonly
   * @type {(state: State) => V}
   */
  #create
  /**
   * @readonly
   * @type {(value: V, transaction: Transaction) => V}
   */
  #update
  /**
   * @readonly
   * @type {WeakMap<State, Readonly<{ value: V }>>}
   */
  #values = new WeakMap()

  /**
   * @param {(state: State) => V} create - Its first value, from the state it starts in
   * @param {(value: V, transaction: Transaction) => V} update - Its value after a transaction
   */
  constructor(create, update) {
    this.#create = create
    this.#update = update
  }

  /**
   * Puts the field in a configuration.
   * @param {Builder} into - The configuration being built
   * @returns {void}
   */
  install(into) {
    into.field(this, (state) => {
      this.read(state)
    })
  }

  /**
   * The field's value in a state, worked out the first time it is asked for: another field's value can be read while
   * working out one, in any order, as long as no field needs its own.
   * @param {State} state - The state
   * @returns {V} The value
   */
  read(state) {
    const known = this.#values.get(state)
    if (known) {
      return known.value
    }
    const value = state.working(this, (transaction) =>
      transaction === undefined ? this.#create(state) : this.#update(this.read(transaction.startState), transaction),
    )
    this.#values.set(state, { value })
    return value
  }
}

/**
 * Filters every transaction's effects before they apply, unless the transaction says `filter: false`: in order, each
 * filter given the effects the one before kept.
 * @type {Facet<TransactionFilter, readonly TransactionFilter[]>}
 */
const transactionFilter = new Facet((filters) => filters)

/**
 * A state: the configuration extensions made, and each field's value. A state never changes; a transaction makes a new
 * one.
 */
class State {
  /**
   * @readonly
   * @type {Configuration}
   */
  #configuration
  /**
   * The transaction this state comes from, while its fields are being worked out.
   * @type {Transaction | undefined}
   */
  #from
  /**
   * The fields being worked out now, so a field that needs its own value is an error, not a loop.
   * @readonly
   * @type {Set<object>}
   */
  #working = new Set()

  /**
   * @param {Configuration} configuration - What the extensions configured
   * @param {Transaction | undefined} from - The transaction it comes from, if any
   */
  constructor(configuration, from) {
    this.#configuration = configuration
    this.#from = from
  }

  /**
   * A first state, configured by extensions.
   * @param {Extension} extensions - The extensions
   * @returns {State} The state
   */
  static create(extensions) {
    const builder = new Builder()
    builder.add(extensions, DEFAULT_LEVEL)
    const state = new State(builder.done(), undefined)
    state.settle()
    return state
  }

  /**
   * A field's value.
   * @template V
   * @param {Field<V>} field - The field
   * @returns {V} Its value
   * @throws {RangeError} If the field isn't configured
   */
  field(field) {
    return field.read(this)
  }

  /**
   * Whether a field is configured.
   * @param {object} field - The field
   * @returns {boolean} Whether it is
   */
  has(field) {
    return this.#configuration.has(field)
  }

  /**
   * A facet's output.
   * @template I, O
   * @param {Facet<I, O>} facet - The facet
   * @returns {O} Its output
   */
  facet(facet) {
    return facet.read(this.#configuration)
  }

  /**
   * A transaction from this state: its effects, after the transaction filters unless it says `filter: false`.
   * @param {TransactionSpec} spec - What it is asked for
   * @returns {Transaction} The transaction, with the new state
   */
  update(spec) {
    const { effects = [] } = spec
    let applied = 'type' in effects ? [effects] : effects
    if (spec.filter !== false) {
      for (const filter of this.facet(transactionFilter)) {
        applied = filter(applied, this)
      }
    }
    return new Transaction(this, applied, (transaction) => new State(this.#configuration, transaction))
  }

  /**
   * Works out one field's value: from the transaction this state comes from, or, in a first state, from nothing.
   * @template V
   * @param {object} field - The field
   * @param {(from: Transaction | undefined) => V} work - Works it out
   * @returns {V} The value
   * @throws {RangeError} If the field isn't configured, or needs its own value
   */
  working(field, work) {
    if (!this.#configuration.has(field)) {
      throw new RangeError('That field is not in this state: include it in the extensions')
    }
    if (this.#working.has(field)) {
      throw new RangeError('A field needs its own value to work it out')
    }
    this.#working.add(field)
    try {
      return work(this.#from)
    } finally {
      this.#working.delete(field)
    }
  }

  /**
   * Works out every field's value, then lets go of the transaction, so no state keeps the ones before it.
   * @returns {void}
   */
  settle() {
    this.#configuration.settle(this)
    this.#from = undefined
  }
}

/**
 * A change from one state to the next: the effects it carries, and the state before and after.
 */
class Transaction {
  /**
   * @param {State} startState - The state it starts from
   * @param {readonly Effect<unknown>[]} effects - What it carries
   * @param {(transaction: Transaction) => State} makeState - Makes the state after it, its fields not yet worked out
   */
  constructor(startState, effects, makeState) {
    /** @readonly */
    this.startState = startState
    /** @readonly */
    this.effects = effects
    /** @readonly */
    this.state = makeState(this)
    this.state.settle()
  }

  /**
   * The values of the effects of one type it carries, in order.
   * @template V
   * @param {EffectType<V>} type - The type
   * @returns {V[]} The values
   */
  effectsOf(type) {
    /** @type {V[]} */
    const values = []
    for (const effect of this.effects) {
      if (effect.is(type)) {
        values.push(effect.value)
      }
    }
    return values
  }
}

/**
 * A facet, combining its inputs with `combine`; by default, its output is the list of its inputs in order.
 * @template I, O
 * @param {(inputs: readonly I[]) => O} combine - Makes its output from its inputs
 * @returns {Facet<I, O>} The facet
 */
function defineFacet(combine) {
  return new Facet(combine)
}

/**
 * A facet whose output is its inputs in order.
 * @template I
 * @returns {Facet<I, readonly I[]>} The facet
 */
function listFacet() {
  return new Facet((inputs) => inputs)
}

/**
 * A state field.
 * @template V
 * @param {Readonly<{ create: (state: State) => V, update: (value: V, transaction: Transaction) => V }>} spec - Its first
 *   value and its value after each transaction
 * @returns {Field<V>} The field
 */
function defineField(spec) {
  return new Field(spec.create, spec.update)
}

/**
 * A kind of effect.
 * @template V
 * @returns {EffectType<V>} The type
 */
function defineEffect() {
  return new EffectType()
}

/**
 * An extension at a level: its parts come before those at lower levels, and after those at higher ones.
 * @param {Level} level - The level
 * @param {Extension} extension - The extension
 * @returns {Part} The extension at that level
 */
function precedence(level, extension) {
  const index = LEVELS.indexOf(level)
  return {
    install: (into) => {
      into.add(extension, index)
    },
  }
}

/**
 * Hands one piece of state to the app: effects of a type are dropped from every filtered transaction and handed to
 * `heard`, as requests; the app makes the change it decides on with a transaction that says `filter: false`.
 * @template V
 * @param {EffectType<V>} type - The effects that change the piece
 * @param {(value: V) => void} heard - Hears each request
 * @returns {Part} The extension
 */
function controlled(type, heard) {
  return transactionFilter.of((effects) =>
    effects.filter((effect) => {
      if (!effect.is(type)) {
        return true
      }
      heard(effect.value)
      return false
    }),
  )
}

export {
  Builder,
  Effect,
  EffectType,
  Facet,
  Field,
  State,
  Transaction,
  controlled,
  defineEffect,
  defineFacet,
  defineField,
  listFacet,
  precedence,
  transactionFilter,
}
