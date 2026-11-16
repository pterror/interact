<!--
  One part of a widget and what is in it: the element the part is drawn as (a `button` for a button, else a `div`) with
  its attributes, or the component the app replaces it by, given the attributes and which part it is, its contents in
  its default slot
-->
<script>
  import { attributesOf, elementFor, identity, partName } from '@pterror/interact-core'

  /** @type {import('@pterror/interact-core').Node} */
  export let node
  /** @type {import('@pterror/interact-core').Naming} */
  export let naming
  /** @type {any} */
  export let item = undefined
  /** @type {Record<string, any>} */
  export let parts = {}

  $: name = partName(node.target)
  $: replaced = parts[name]
  $: kind = elementFor(node.role)
  $: attrs = attributesFor(node, replaced === undefined)

  /**
   * The attributes a part's element takes
   * @param {import('@pterror/interact-core').Node} part - The part
   * @param {boolean} own - Whether it is drawn as its own element
   * @returns {Record<string, unknown>} The attributes
   */
  function attributesFor(part, own) {
    /** @type {Record<string, unknown>} */
    const set = {}
    const { implicitRole, tag } = elementFor(part.role)
    for (const [attribute, value] of attributesOf(part, naming, own ? implicitRole : null)) {
      if (value !== null) {
        set[attribute] = value
      }
    }
    if (own && tag === 'button') {
      set['type'] = 'button'
    }
    return set
  }
</script>

{#if replaced !== undefined}
  <svelte:component this={replaced} {attrs} part={{ item: node.target.item, name }}>
    {#each node.content as content, index ('target' in content ? identity(content.target, naming) : `content ${String(index)}`)}
      {#if 'target' in content}
        <svelte:self {item} {naming} node={content} {parts} />
      {:else if 'text' in content}
        {content.text}
      {:else if item !== undefined}
        <svelte:component this={item} key={content.item} />
      {:else}
        {String(content.item)}
      {/if}
    {/each}
  </svelte:component>
{:else}
  <svelte:element this={kind.tag} {...attrs}>
    {#each node.content as content, index ('target' in content ? identity(content.target, naming) : `content ${String(index)}`)}
      {#if 'target' in content}
        <svelte:self {item} {naming} node={content} {parts} />
      {:else if 'text' in content}
        {content.text}
      {:else if item !== undefined}
        <svelte:component this={item} key={content.item} />
      {:else}
        {String(content.item)}
      {/if}
    {/each}
  </svelte:element>
{/if}
