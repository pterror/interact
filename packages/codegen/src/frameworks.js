/**
 * Each framework's components, written from the widgets as `describe` reads them: per widget, a module (or, for
 * Svelte, a component file per syntax) giving the framework's glue the widget's description and typing its props by
 * the widget's own types, and an index. A factory of widgets (the dialog) gives a factory of components, or for
 * Svelte, a component taking the factory's arguments as `of`.
 */

/** @import { Described } from './components.js' */

/**
 * The files a framework's package gets, by path from its `src`
 * @typedef {ReadonlyMap<string, string>} Files
 */

/**
 * A name with its first letter capital
 * @param {string} name - The name
 * @returns {string} It, capitalised
 */
function capital(name) {
  return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
}

/**
 * The module a widget is imported from, by its path in the core
 * @param {Described} widget - The widget
 * @returns {string} The specifier
 */
function coreModule(widget) {
  return `@pterror/interact-core/${widget.module.replace(/^.*\/(?<name>[\w-]+)\.js$/u, '$<name>')}`
}

/**
 * The module a widget's generated in-place code is imported from, which components run
 * @param {Described} widget - The widget
 * @returns {string} The specifier
 */
function generatedModule(widget) {
  return `@pterror/interact-core/generated/${widget.name}`
}

/**
 * The imports of a widget's generated code as `widget`, and its source's types as `source`
 * @param {Described} widget - The widget
 * @returns {Readonly<{ code: string, types: string }>} The import, and the type import
 */
function widgetImports(widget) {
  return {
    code: `import { ${widget.name} as widget } from '${generatedModule(widget)}'`,
    types: `/** @import { ${widget.name} as source } from '${coreModule(widget)}' */`,
  }
}

/**
 * The description of a widget as a literal, its widget named `widget`
 * @param {Described} widget - The widget
 * @param {string} widgetExpression - The widget, as written
 * @param {string} inside - The descriptions inside, as written
 * @returns {string} The literal
 */
function descriptionLiteral(widget, widgetExpression, inside) {
  return `{ events: ${JSON.stringify(widget.events)}, inside: ${inside}, props: ${JSON.stringify(widget.props)}, sources: ${JSON.stringify(widget.sources)}, value: ${
    widget.value === null ? 'null' : JSON.stringify(widget.value)
  }, ${widgetExpression === 'widget' ? 'widget' : `widget: ${widgetExpression}`} }`
}

/**
 * The union of a widget's own part names, as a type
 * @param {Described} widget - The widget
 * @returns {string} The union
 */
function partUnion(widget) {
  return widget.parts.map((part) => `'${part.name}'`).join(' | ') || 'never'
}

/**
 * The union of a widget's props that name a collection, as a type
 * @param {Described} widget - The widget
 * @returns {string} The union
 */
function sourceUnion(widget) {
  return widget.sources.map((prop) => `'${prop}'`).join(' | ') || 'never'
}

/**
 * The type of a widget's events, from its effects' types
 * @param {Described} widget - The widget
 * @returns {string} The union of its event effects
 */
function eventType(widget) {
  return widget.events.length === 0
    ? 'never'
    : `Extract<EffectOf<Widget>, Readonly<{ type: ${widget.events.map((event) => `'${event}'`).join(' | ')} }>>`
}

/**
 * The type of a widget's bound value
 * @param {Described} widget - The widget
 * @returns {string} Its type
 */
function valueType(widget) {
  const { value } = widget
  if (value === null) {
    return 'never'
  }
  return value.wrapped ? `NonNullable<WidgetProps['${value.prop}']>['value']` : `WidgetProps['${value.prop}']`
}

/**
 * The JSDoc lines of a description
 * @param {string} doc - The description
 * @returns {string} The lines, each starting ` * `
 */
function docLines(doc) {
  /** @type {string[]} */
  const lines = []
  let line = ''
  for (const word of doc.split(/\s+/u).filter((one) => one !== '')) {
    if (line.length + word.length + 1 > 110) {
      lines.push(line)
      line = word
    } else {
      line = line === '' ? word : `${line} ${word}`
    }
  }
  if (line !== '') {
    lines.push(line)
  }
  return lines.map((one) => ` * ${one}`).join('\n')
}

/**
 * The factory's parameters that are widgets it takes inside, with the prop each is given by
 * @param {Described} widget - The factory
 * @returns {Readonly<{ name: string, doc: string, inside: string }>[]} The parameters
 */
function insideParams(widget) {
  return (widget.factory ?? []).flatMap((param) => (param.inside === null ? [] : [{ ...param, inside: param.inside }]))
}

/**
 * The file a widget's module is in, by its name
 * @param {string} name - The widget's name
 * @returns {string} The name in kebab case
 */
function fileName(name) {
  return name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * A module for a framework whose glue makes components with `component(description, name)` and types them as
 * `Component<Own, Parts>`: React's, Vue's and Solid's
 * @param {Described} widget - The widget
 * @param {string} header - The generated files' header
 * @param {string} glue - The module of the glue, from the widget's module
 * @param {boolean} named - Whether the glue takes the component's name
 * @returns {string} The module
 */
function componentModule(widget, header, glue, named) {
  const name = capital(widget.name)
  const factory = widget.factory !== null
  const glueTypes = factory ? 'AnyComponent, Component, Own, OwnOf, PartsInside' : 'Component, Own'
  const coreTypes = widget.events.length > 0 ? 'EffectOf, PropsOf' : 'PropsOf'
  const imported = widgetImports(widget)
  const types = [
    `/** @import { ${glueTypes} } from '${glue}' */`,
    `/** @import { ${coreTypes} } from '@pterror/interact-core' */`,
    imported.types,
  ].join('\n')
  if (widget.factory === null) {
    return `${header}
${imported.code}

import { component } from '${glue}'

${types}

/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

/** @typedef {${partUnion(widget)}} ${name}Parts */
/** @typedef {Own<WidgetProps, ${widget.value === null ? 'never' : `'${widget.value.prop}'`}, ${valueType(widget)}, ${eventType(widget)}, unknown, ${sourceUnion(widget)}>} ${name}Props */

/**
${docLines(widget.doc)}
 * @type {Component<${name}Props, ${name}Parts>}
 */
const ${name} = component(${descriptionLiteral(widget, 'widget', '{}')}${named ? `, '${name}'` : ''})

export { ${name} }
`
  }
  const factoryParams = widget.factory
  const inside = insideParams(widget)
  const generics = inside.map((param) => ` * @template {AnyComponent} ${capital(param.name)}`).join('\n')
  const params = factoryParams
    .map((param) =>
      param.inside === null
        ? ` * @param {Parameters<typeof source>[${String(factoryParams.indexOf(param))}]} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`
        : ` * @param {${capital(param.name)}} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`,
    )
    .join('\n')
  const insideProps = `Readonly<{ ${inside.map((param) => `${param.inside}: OwnOf<${capital(param.name)}>`).join(', ')} }>`
  const parts = [
    partUnion(widget),
    ...inside.map((param) => `PartsInside<${capital(param.name)}, '${param.inside}'>`),
  ].join(' | ')
  const args = factoryParams
    .map((param) => (param.inside === null ? param.name : `${param.name}.description.widget`))
    .join(', ')
  const insideLiteral = `{ ${inside.map((param) => `${param.inside}: ${param.name}.description`).join(', ')} }`
  return `${header}
${imported.code}

import { component } from '${glue}'

${types}

/** @typedef {ReturnType<typeof source>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

/**
${docLines(widget.doc)}
${generics}
${params}
 * @returns {Component<Own<WidgetProps, ${widget.value === null ? 'never' : `'${widget.value.prop}'`}, ${valueType(widget)}, ${eventType(widget)}, ${insideProps}, ${sourceUnion(widget)}>, ${parts}>}
 *   The component
 */
function ${widget.name}(${factoryParams.map((param) => param.name).join(', ')}) {
  return component(${descriptionLiteral(widget, `widget(${args})`, insideLiteral)}${named ? `, '${name}'` : ''})
}

export { ${widget.name} }
`
}

/**
 * The index of a framework's package: its glue and every widget's component
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The header
 * @param {string} glue - What the index exports from the glue
 * @returns {string} The index
 */
function componentIndex(widgets, header, glue) {
  const lines = widgets.map(
    (widget) =>
      `export { ${widget.factory === null ? capital(widget.name) : widget.name} } from './widgets/${fileName(widget.name)}.js'`,
  )
  return `${header}
${glue}
${lines.join('\n')}
`
}

/**
 * React's components
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function react(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    files.set(`widgets/${fileName(widget.name)}.js`, componentModule(widget, header, '../interact.js', true))
  }
  files.set(
    'index.js',
    componentIndex(
      widgets,
      header,
      `export { component } from './interact.js'\n\n/** @typedef {import('./interact.js').Change} Change */\n/** @typedef {import('./interact.js').PartProps} PartProps */`,
    ),
  )
  return files
}

/**
 * A Vue component's module: the component made by `defineComponent` from the glue's setup, so Vue's tools type it
 * by its props, events and slots
 * @param {Described} widget - The widget
 * @param {string} header - The generated files' header
 * @returns {string} The module
 */
function vueModule(widget, header) {
  const name = capital(widget.name)
  const bound = widget.value === null ? 'never' : `'${widget.value.prop}'`
  const coreTypes = widget.events.length > 0 ? 'EffectOf, PropsOf' : 'PropsOf'
  const typing = `${valueType(widget)}, ${eventType(widget)}`
  const factory = widget.factory ?? []
  const inside = insideParams(widget)
  const own = `Own<WidgetProps, ${bound}, ${typing}, ${
    inside.length === 0
      ? 'unknown'
      : `Readonly<{ ${inside.map((param) => `${param.inside}: OwnOf<${capital(param.name)}>`).join(', ')} }>`
  }, ${sourceUnion(widget)}>`
  const parts = [
    partUnion(widget),
    ...inside.map((param) => `PartsInside<${capital(param.name)}, '${param.inside}'>`),
  ].join(' | ')
  const args = factory
    .map((param) => (param.inside === null ? param.name : `${param.name}.description.widget`))
    .join(', ')
  const insideLiteral = `{ ${inside.map((param) => `${param.inside}: ${param.name}.description`).join(', ')} }`
  const made = (/** @type {string} */ indent, /** @type {string} */ widgetExpression) =>
    [
      '/** @type {Description} */',
      `const description = ${descriptionLiteral(widget, widgetExpression, inside.length === 0 ? '{}' : insideLiteral)}`,
      '/**',
      ' * The setup',
      ` * @param {${own} & Given} props - The props`,
      ` * @param {SetupContext<Emits<${bound}, ${typing}>, SlotsType<Slots<${parts}>>>} context - The slots and emit`,
      ' * @returns {() => VNodeChild} The render function',
      ' */',
      'const setup = (props, context) => run(description, props, context)',
      `/** @type {() => Readonly<{ own: ${own}, parts: ${parts} }> | undefined} */`,
      'const types = typesOf',
    ]
      .map((line) => `${indent}${line}`)
      .join('\n')
  const imported = widgetImports(widget)
  const imports = `${imported.code}
import { defineComponent } from 'vue'

import { optionsOf, run, typesOf } from '../interact.js'

/** @import { ${inside.length === 0 ? '' : 'AnyComponent, '}Emits, Given, Own${inside.length === 0 ? '' : ', OwnOf, PartsInside'}, Slots } from '../interact.js' */
/** @import { Description, ${coreTypes} } from '@pterror/interact-core' */
/** @import { SetupContext, SlotsType, VNodeChild } from 'vue' */
${imported.types}`
  if (widget.factory === null) {
    return `${header}
${imports}

/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

${made('', 'widget')}

/**
${docLines(widget.doc)}
 */
const ${name} = Object.assign(defineComponent(setup, optionsOf(description, '${name}')), { description, types: types() })

export { ${name} }
`
  }
  const generics = inside.map((param) => ` * @template {AnyComponent} ${capital(param.name)}`).join('\n')
  const params = factory
    .map((param) =>
      param.inside === null
        ? ` * @param {Parameters<typeof source>[${String(factory.indexOf(param))}]} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`
        : ` * @param {${capital(param.name)}} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`,
    )
    .join('\n')
  return `${header}
${imports}

/** @typedef {ReturnType<typeof source>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

/**
${docLines(widget.doc)}
${generics}
${params}
 * @returns The component, its slots each part's
 */
function ${widget.name}(${factory.map((param) => param.name).join(', ')}) {
${made('  ', `widget(${args})`)}
  /** @type {SlotsType<Slots<${parts}>>} */
  const slots = {}
  return Object.assign(defineComponent(setup, { ...optionsOf(description, '${name}'), slots }), {
    description,
    types: types(),
  })
}

export { ${widget.name} }
`
}

/**
 * Solid's components, beside the package's own modules
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function solid(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    files.set(`widgets/${fileName(widget.name)}.js`, componentModule(widget, header, '../component.js', false))
  }
  files.set('widgets/index.js', componentIndex(widgets, header, '').replaceAll("'./widgets/", "'./"))
  return files
}

/**
 * Svelte's components: per widget, a module of its description (or, for a factory, making it), a component in runes
 * (Svelte 5) and one in the legacy syntax (Svelte 4) binding the widget's bound value by its own name, each with its
 * declarations
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function svelte(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  const comment = header.replace(/^\/\/ ?/u, '')
  for (const widget of widgets) {
    const name = capital(widget.name)
    const file = fileName(widget.name)
    const bound = widget.value?.prop ?? null
    const inside = insideParams(widget)
    const factory = widget.factory ?? []
    const svelteOwn = (/** @type {string} */ insideTypes) =>
      `Own<PropsOf<${widget.factory === null ? 'typeof source' : 'ReturnType<typeof source>'}>, ${bound === null ? 'never' : `'${bound}'`}, ${valueType(widget).replaceAll('WidgetProps', `PropsOf<${widget.factory === null ? 'typeof source' : 'ReturnType<typeof source>'}>`)}, ${eventType(widget).replace('EffectOf<Widget>', 'EffectOf<typeof source>')}, ${insideTypes}, ${sourceUnion(widget)}>`
    const descriptionModule =
      widget.factory === null
        ? `${header}
${widgetImports(widget).code}

${widgetImports(widget).types}
/** @import { Described, Own } from '../run.js' */
/** @import { ${widget.events.length > 0 ? 'EffectOf, ' : ''}PropsOf } from '@pterror/interact-core' */

/**
${docLines(widget.doc)}
 * @type {Described<${svelteOwn('unknown')}, ${partUnion(widget)}>}
 */
const ${widget.name} = ${descriptionLiteral(widget, 'widget', '{}')}

export { ${widget.name} }
`
        : `${header}
${widgetImports(widget).code}

${widgetImports(widget).types}
/** @import { Described, Own, OwnOf } from '../run.js' */
/** @import { ${widget.events.length > 0 ? 'EffectOf, ' : ''}PropsOf } from '@pterror/interact-core' */

/**
${docLines(widget.doc)}
${inside.map((param) => ` * @template {Described<unknown, string>} ${capital(param.name)}`).join('\n')}
${factory
  .map((param) =>
    param.inside === null
      ? ` * @param {Parameters<typeof source>[${String(factory.indexOf(param))}]} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`
      : ` * @param {${capital(param.name)}} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`,
  )
  .join('\n')}
 * @returns {Described<${svelteOwn(`Readonly<{ ${inside.map((param) => `${param.inside}: OwnOf<${capital(param.name)}>`).join(', ')} }>`)}, ${[partUnion(widget), ...inside.map((param) => `Exclude<NonNullable<${capital(param.name)}['types']>['parts'], 'root'> | '${param.inside}'`)].join(' | ')}>} The description
 */
function ${widget.name}(${factory.map((param) => param.name).join(', ')}) {
  return ${descriptionLiteral(
    widget,
    `widget(${factory.map((param) => (param.inside === null ? param.name : `${param.name}.widget`)).join(', ')})`,
    `{ ${inside.map((param) => `${param.inside}: ${param.name}`).join(', ')} }`,
  )}
}

export { ${widget.name} }
`
    files.set(`widgets/${file}.js`, descriptionModule)
    const of = widget.factory === null ? '' : 'of, '
    const made =
      widget.factory === null
        ? `const description = ${widget.name}`
        : `const description = ${widget.name}(${factory.map((param) => `of.${param.name}`).join(', ')})`
    files.set(
      `widgets/${file}.svelte`,
      `<!-- ${comment} -->
<script>
  import Interact from '../interact.svelte'
  import { ${widget.name} } from './${file}.js'

  /** @type {Record<string, unknown>} */
  let { ${of}${bound === null ? '' : `${bound} = $bindable(), `}...rest } = $props()
  ${made}
</script>

<Interact {description}${bound === null ? '' : ` bind:bound={${bound}}`} {...rest} />
`,
    )
    const typing = `${valueType(widget)}, ${eventType(widget)}`
    const generics = inside.map((param) => `${capital(param.name)} extends Described<unknown, string>`).join(', ')
    const insideOwn =
      inside.length === 0
        ? 'unknown'
        : `{ ${inside.map((param) => `${param.inside}: OwnOf<${capital(param.name)}>`).join('; ')} }`
    const own = `Own<WidgetProps, ${bound === null ? 'never' : `'${bound}'`}, ${typing}, ${insideOwn}, ${sourceUnion(widget)}>`
    const partNames = [
      partUnion(widget),
      ...inside.map(
        (param) => `Exclude<NonNullable<${capital(param.name)}['types']>['parts'], 'root'> | '${param.inside}'`,
      ),
    ].join(' | ')
    const ofType = `Readonly<{ ${factory.map((param) => `${param.name}: ${param.inside === null ? `Parameters<typeof widget>[${String(factory.indexOf(param))}]` : capital(param.name)}`).join('; ')} }>`
    const typeImports = `import type { ${widget.events.length > 0 ? 'EffectOf, ' : ''}Key, PropsOf } from '@pterror/interact-core'
import type { ${widget.name} as widget } from '${coreModule(widget)}'`
    const typeAliases = `type Widget = ${widget.factory === null ? 'typeof widget' : 'ReturnType<typeof widget>'}
type WidgetProps = PropsOf<Widget>
`
    const props = `${own} &
    HostProps & {
      children?: Snippet<[Key]>
      parts?: Readonly<Partial<Record<${partNames}, Snippet<[Record<string, unknown>, Readonly<{ name: string; item: Key | null }>, Snippet]>>>>${
        widget.factory === null ? '' : `\n      of: ${ofType}`
      }
    }`
    files.set(
      `widgets/${file}.svelte.d.ts`,
      `${header}
${typeImports}
import type { ${widget.factory === null ? 'Component' : 'ComponentInternals'}, Snippet } from 'svelte'

import type { ${widget.factory === null ? '' : 'Described, '}HostProps, Own${widget.factory === null ? '' : ', OwnOf'} } from '../run.js'

${typeAliases}
/**
${docLines(widget.doc)}
 */
${
  widget.factory === null
    ? `declare const ${name}: Component<
  ${props},
  Record<string, never>,
  ${bound === null ? 'never' : `'${bound}'`}
>`
    : `declare const ${name}: (<${generics}>(
  this: void,
  internals: ComponentInternals,
  props: ${props},
) => Record<string, never>) & { element?: typeof HTMLElement; z_$$bindings?: ${bound === null ? 'never' : `'${bound}'`} }`
}
export default ${name}
`,
    )
    files.set(
      `legacy/widgets/${file}.svelte.d.ts`,
      `${header}
${typeImports}
import type { SvelteComponent } from 'svelte'

import type { ${widget.factory === null ? '' : 'Described, '}HostProps${widget.factory === null ? '' : ', OwnOf'} } from '../../run.js'

${typeAliases}
/**
${docLines(widget.doc)}
 */
declare class ${name}${widget.factory === null ? '' : `<${generics}>`} extends SvelteComponent<
  Omit<WidgetProps, ${
    [bound, ...inside.map((param) => param.inside)]
      .filter((one) => one !== null)
      .map((one) => `'${one}'`)
      .join(' | ') || 'never'
  }> &
    HostProps & {${bound === null ? '' : ` ${bound}?: ${valueType(widget)};`}${inside.map((param) => ` ${param.inside}: OwnOf<${capital(param.name)}>;`).join('')} item?: unknown; parts?: Readonly<Record<string, unknown>>${widget.factory === null ? '' : `; of: ${ofType}`} },
  { change: CustomEvent<{ value: ${valueType(widget)}; change: { refuse: () => void } }>${widget.events.map((event) => `; ${event}: CustomEvent<Extract<${widget.events.length > 0 ? 'EffectOf<Widget>' : 'never'}, { type: '${event}' }>>`).join('')} }
> {}
export default ${name}
`,
    )
    files.set(
      `legacy/widgets/${file}.svelte`,
      `<!-- ${comment} -->
<script>
  import Interact from '../interact.svelte'
  import { ${widget.name} } from '../../widgets/${file}.js'
${widget.factory === null ? '' : "\n  /** @type {{ content: import('@pterror/interact-core').Description, initialFocus: readonly string[] }} */\n  export let of\n"}${bound === null ? '' : `\n  /** @type {unknown} */\n  export let ${bound} = undefined\n`}
  ${made}
</script>

<Interact {description}${bound === null ? '' : ` bind:bound={${bound}}`} {...$$restProps} on:change${widget.events.map((event) => ` on:${event}`).join('')}>
</Interact>
`,
    )
  }
  const lines = widgets.flatMap((widget) => [
    `export { default as ${capital(widget.name)} } from './widgets/${fileName(widget.name)}.svelte'`,
    `export { ${widget.name} } from './widgets/${fileName(widget.name)}.js'`,
  ])
  files.set('index.js', `${header}\nexport { default as Interact } from './interact.svelte'\n${lines.join('\n')}\n`)
  files.set(
    'legacy/index.js',
    `${header}\nexport { default as Interact } from './interact.svelte'\n${lines.map((line) => line.replace(/from '\.\/widgets\/(?<file>[\w-]+)\.js'/u, "from '../widgets/$<file>.js'")).join('\n')}\n`,
  )
  return files
}

/**
 * The kinds of an element's props: the widget's props and its bound value, but those holding the props of a widget
 * inside
 * @param {Described} widget - The widget
 * @returns {{ [prop: string]: string }} Each prop's kind
 */
function elementKinds(widget) {
  /** @type {{ [prop: string]: string }} */
  const kinds = {}
  for (const prop of widget.props) {
    kinds[prop] = widget.kinds[prop] ?? 'other'
  }
  if (widget.value !== null) {
    kinds[widget.value.prop] = widget.value.kind
  }
  return kinds
}

/**
 * The tag of a widget's element
 * @param {Described} widget - The widget
 * @returns {string} The tag
 */
function tagOf(widget) {
  return `interact-${fileName(widget.name)}`
}

/**
 * The custom elements: per widget, a module defining its element and registering its tag
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function elements(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    const name = `${capital(widget.name)}Element`
    const inside = insideParams(widget)
    const factory = widget.factory ?? []
    const plain = factory.filter((param) => param.inside === null)
    const info =
      widget.factory === null
        ? `{ description: ${descriptionLiteral(widget, 'widget', '{}')}, factory: null, kinds: ${JSON.stringify(elementKinds(widget))}, params: [] }`
        : `{
  description: null,
  /**
${inside.map((param) => `   * @param {import('@pterror/interact-core').Description} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`).join('\n')}
${plain.map((param) => `   * @param {Parameters<typeof source>[${String(factory.indexOf(param))}]} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`).join('\n')}
   * @returns {import('@pterror/interact-core').Description} The widget, described
   */
  factory: (${inside.map((param) => param.name).join(', ')}, ${plain.map((param) => param.name).join(', ')}) => (${descriptionLiteral(
    widget,
    `widget(${factory.map((param) => (param.inside === null ? param.name : `${param.name}.widget`)).join(', ')})`,
    `{ ${inside.map((param) => `${param.inside}: ${param.name}`).join(', ')} }`,
  )}),
  kinds: ${JSON.stringify(elementKinds(widget))},
  params: ${JSON.stringify(plain.map((param) => param.name))},
}`
    files.set(
      `widgets/${fileName(widget.name)}.js`,
      `${header}
${widgetImports(widget).code}

import { define } from '../element.js'
${widget.factory === null ? '' : `\n${widgetImports(widget).types}\n`}
/**
${docLines(widget.doc)}
 */
const ${name} = define(${info})

export { ${name} }
`,
    )
  }
  files.set(
    'register.js',
    `${header}
${widgets.map((widget) => `import { ${capital(widget.name)}Element } from './widgets/${fileName(widget.name)}.js'`).join('\n')}

/**
 * Each element's tag, and its class
 * @type {readonly (readonly [string, CustomElementConstructor])[]}
 */
const TAGS = [
${widgets.map((widget) => `  ['${tagOf(widget)}', ${capital(widget.name)}Element],`).join('\n')}
]

/**
 * Registers every element's tag in a registry, but those it has already
 * @param {CustomElementRegistry} registry - The registry
 * @returns {void}
 */
function register(registry = customElements) {
  for (const [tag, element] of TAGS) {
    if (registry.get(tag) === undefined) {
      registry.define(tag, element)
    }
  }
}

export { register }
`,
  )
  files.set(
    'index.js',
    `${header}
export { define, InteractElement } from './element.js'
export { register } from './register.js'
${widgets.map((widget) => `export { ${capital(widget.name)}Element } from './widgets/${fileName(widget.name)}.js'`).join('\n')}

/** @import * as Tags from './tags.js' */

/**
 * Each element's tag (with them, \`HTMLElementTagNameMap\` and \`document.createElement\` type every element)
 * @typedef {Tags.Tag} Tag
 */
`,
  )
  files.set('tags.d.ts', tagDeclarations(widgets, header))
  for (const [framework, declared] of jsxDeclarations(widgets, header)) {
    files.set(`jsx/${framework}.d.ts`, declared)
  }
  return files
}

/**
 * The type of each widget's element, by its tag, as \`HTMLElementTagNameMap\` holds it
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {string} The declarations
 */
function tagDeclarations(widgets, header) {
  const types = widgets.map((widget) => {
    const props =
      widget.factory === null
        ? `PropsOf<typeof ${widget.name}>`
        : `Omit<PropsOf<ReturnType<typeof ${widget.name}>>, ${insideParams(widget)
            .map((param) => `'${param.inside}'`)
            .join(' | ')}>`
    const value = widget.value
    const bound =
      value === null
        ? 'never'
        : value.wrapped
          ? `NonNullable<${props}['${value.prop}']>['value']`
          : `${props}['${value.prop}']`
    return `/** The element of ${widget.name} */
export type Interact${capital(widget.name)}Element = ElementOf<${props}, ${value === null ? 'never' : `'${value.prop}'`}, ${bound}, ${sourceUnion(widget)}>`
  })
  return `${header}
import type { PropsOf } from '@pterror/interact-core'
${widgets.map((widget) => `import type { ${widget.name} } from '${coreModule(widget)}'`).join('\n')}

import type { ElementOf } from './element.js'

${types.join('\n\n')}

/** Each element, by its tag */
export interface Tags {
${widgets.map((widget) => `  '${tagOf(widget)}': Interact${capital(widget.name)}Element`).join('\n')}
}

/** Each element's tag */
export type Tag = keyof Tags

declare global {
  interface HTMLElementTagNameMap extends Tags {}
}
`
}

/**
 * An element's properties a framework sets: each one the element takes, but those of every element
 * @param {string} type - The element's type
 * @returns {string} The type of its properties
 */
function settable(type) {
  return `Partial<Omit<${type}, keyof HTMLElement>>`
}

/**
 * The elements as each framework's JSX (or template) types them: their properties, and the attributes of the element
 * they are
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {readonly (readonly [string, string])[]} Each framework's declarations
 */
function jsxDeclarations(widgets, header) {
  const tags = widgets.map((widget) => [tagOf(widget), `Interact${capital(widget.name)}Element`])
  const imports = `import type { ${tags.map(([, type]) => type).join(', ')} } from '../tags.js'`
  return [
    [
      'react',
      `${header}
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

${imports}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
${tags.map(([tag, type]) => `      '${tag}': DetailedHTMLProps<HTMLAttributes<${type}>, ${type}> & ${settable(type ?? '')}`).join('\n')}
    }
  }
}
`,
    ],
    [
      'solid',
      `${header}
import 'solid-js'

${imports}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
${tags.map(([tag, type]) => `      '${tag}': HTMLAttributes<${type}> & ${settable(type ?? '')}`).join('\n')}
    }
  }
}
`,
    ],
    [
      'svelte',
      `${header}
import type { HTMLAttributes } from 'svelte/elements'

${imports}

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
${tags.map(([tag, type]) => `    '${tag}': HTMLAttributes<${type}> & ${settable(type ?? '')}`).join('\n')}
  }
}
`,
    ],
    [
      'vue',
      `${header}
import type { DefineComponent } from 'vue'

${imports}

declare module 'vue' {
  interface GlobalComponents {
${tags.map(([tag, type]) => `    '${tag}': DefineComponent<${settable(type ?? '')}>`).join('\n')}
  }
}
`,
    ],
  ]
}

/**
 * Vue's components
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function vue(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    files.set(`widgets/${fileName(widget.name)}.js`, vueModule(widget, header))
  }
  files.set(
    'index.js',
    componentIndex(
      widgets,
      header,
      `export { optionsOf, run, typesOf } from './interact.js'\n\n/** @typedef {import('./interact.js').Change} Change */\n/** @typedef {import('./interact.js').PartSlot} PartSlot */`,
    ),
  )
  return files
}

export {
  elementKinds,
  elements,
  solid,
  tagOf,
  svelte,
  vue,
  capital,
  componentIndex,
  componentModule,
  coreModule,
  descriptionLiteral,
  docLines,
  fileName,
  insideParams,
  react,
}
