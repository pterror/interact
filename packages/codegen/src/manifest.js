/**
 * The Custom Elements Manifest (https://github.com/webcomponents/custom-elements-manifest, schema 2.1.0) of the
 * elements `elements` writes: each element's tag, attributes, properties, events, slots, CSS parts and custom states,
 * from the widget it runs.
 */

import { capital, elementKinds, fileName, insideParams, tagOf } from './frameworks.js'

/** @import { Described } from './components.js' */

/** The properties every element takes beside its widget's props, and what each is */
const HOST = [
  ['item', '(key: Key) => string | Node', 'How an item is drawn: by default, its text in its source'],
  [
    'itemName',
    '(key: Key) => string',
    "An item's name in announcements: by default, its text in the items given, or its key",
  ],
  ['naming', 'Naming', 'How ids are made: by default, a prefix of its own and each key as text'],
  [
    'outside',
    '{ [name: string]: string | Element }',
    'The elements outside it its widget refers to, by the names it gives them, each by id or as the element (its `label` is by default its first `<label>`)',
  ],
  ['sources', '{ [name: string]: Source }', 'The collections the widget asks about, by the names its props give them'],
  ['translate', '(input) => input | null', 'Rebinds a key: the standard key the widget hears for one pressed'],
  ['words', 'Words', 'The words announcements use, over the English ones'],
]

/**
 * An attribute's name: a prop's, in kebab case
 * @param {string} name - The prop
 * @returns {string} The attribute
 */
function attributeName(name) {
  return name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * The manifest of every widget's element
 * @param {readonly Described[]} widgets - The widgets
 * @returns {string} The manifest, as JSON
 */
function manifest(widgets) {
  const modules = widgets.map((widget) => {
    const name = `${capital(widget.name)}Element`
    const path = `src/widgets/${fileName(widget.name)}.js`
    const kinds = elementKinds(widget)
    const bound = widget.value?.prop ?? null
    const plain = (widget.factory ?? []).filter((param) => param.inside === null)
    const inside = insideParams(widget)
    const attributes = [
      ...Object.entries(kinds)
        .filter(([, kind]) => kind !== 'other')
        .map(([prop, kind]) => ({
          description:
            prop === bound
              ? 'The bound value: where it starts, and (for a flag) where it is'
              : `The widget's \`${prop}\``,
          fieldName: prop,
          name: attributeName(prop),
          type: { text: kind },
        })),
      ...plain.map((param) => ({
        description: `${param.doc.replaceAll('\n', ' ')}, as a space-separated list`,
        name: attributeName(param.name),
        type: { text: 'string' },
      })),
      ...(widget.value !== null && (widget.value.kind === 'string' || widget.value.kind === 'number')
        ? [
            {
              description: 'The name of its field in its form, whose value is the bound value',
              name: 'name',
              type: { text: 'string' },
            },
          ]
        : []),
    ]
    const members = [
      ...Object.entries(kinds).map(([prop, kind]) => ({
        description: prop === bound ? 'The bound value, which a change sets' : `The widget's \`${prop}\``,
        kind: 'field',
        name: prop,
        type: { text: kind === 'other' ? 'unknown' : kind },
      })),
      ...widget.sources.map((prop) => ({
        description: `The items of the collection \`${prop}\` names, in its place: keys, or keys with their text`,
        kind: 'field',
        name: prop === 'source' ? 'items' : `${prop}Items`,
        type: { text: 'readonly (Key | { key: Key, text: string })[]' },
      })),
      ...HOST.map(([field, text, description]) => ({ description, kind: 'field', name: field, type: { text } })),
    ]
    const events = [
      ...(bound === null
        ? []
        : [
            {
              description:
                'The bound value changed (on the element inside, for a change of its own): cancelling it refuses the change, as `detail.refuse()` does later',
              name: 'change',
              type: { text: 'CustomEvent<{ value: unknown, refuse: () => void }>' },
            },
          ]),
      ...widget.events.map((event) => ({
        description: `The widget's \`${event}\` effect, as its detail`,
        name: event,
        type: { text: 'CustomEvent' },
      })),
    ]
    const parts = [
      ...widget.parts.map((part) => ({
        description: `${part.role === null ? 'A part' : `The ${part.role}`}${part.perKey ? ', one per item' : ''}; its \`part\` also names each state it shows`,
        name: part.name,
      })),
      ...inside.map((param) => ({ description: `The root of the element inside (${param.name})`, name: param.inside })),
    ]
    return {
      declarations: [
        {
          attributes,
          cssParts: parts,
          cssStates: widget.states.map((state) => ({
            description: `A part drawn once shows \`${state}\``,
            name: state,
          })),
          customElement: true,
          description: widget.doc,
          events,
          kind: 'class',
          members,
          name,
          slots: widget.parts
            .filter((part) => part.text)
            .map((part) => ({
              description: `What the \`${part.name}\` part says, over the widget's text`,
              name: part.name,
            })),
          superclass: { module: 'src/element.js', name: 'InteractElement' },
          tagName: tagOf(widget),
        },
      ],
      exports: [{ declaration: { module: path, name }, kind: 'js', name }],
      kind: 'javascript-module',
      path,
    }
  })
  const register = {
    declarations: [
      {
        description: "Registers every element's tag in a registry (by default the page's), but those it has already",
        kind: 'function',
        name: 'register',
        parameters: [{ name: 'registry', optional: true, type: { text: 'CustomElementRegistry' } }],
      },
    ],
    exports: [
      { declaration: { module: 'src/register.js', name: 'register' }, kind: 'js', name: 'register' },
      ...widgets.map((widget) => ({
        declaration: { module: `src/widgets/${fileName(widget.name)}.js`, name: `${capital(widget.name)}Element` },
        kind: 'custom-element-definition',
        name: tagOf(widget),
      })),
    ],
    kind: 'javascript-module',
    path: 'src/register.js',
  }
  return `${JSON.stringify({ modules: [...modules, register], schemaVersion: '2.1.0' }, null, 2)}\n`
}

export { manifest }
