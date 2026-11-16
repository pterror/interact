<!--
  One part of a widget and what is in it: the element the part is drawn as (a `button` for a button, else a `div`) with
  its attributes, or the snippet the app replaces it by, given the attributes, which part it is, and its contents
-->
<script>
  import { attributesOf, elementFor, identity, itemText, partName } from '@pterror/interact-core'

  import Part from './part.svelte'

  /** @type {{ node: import('@pterror/interact-core').Node, naming: import('@pterror/interact-core').Naming, item: ((key: import('@pterror/interact-core').Key) => unknown) | undefined, sources: Readonly<Record<string, import('@pterror/interact-core').Source>> | undefined, parts: Readonly<Record<string, ((attrs: Record<string, unknown>, part: Readonly<{ name: string, item: import('@pterror/interact-core').Key | null }>, children: import('svelte').Snippet) => unknown) | undefined>> }} */
  let { item, naming, node, parts, sources } = $props()

  const name = $derived(partName(node.target))
  const replaced = $derived(parts[name])
  const kind = $derived(elementFor(node.role))
  const attrs = $derived.by(() => {
    /** @type {Record<string, unknown>} */
    const set = {}
    for (const [attribute, value] of attributesOf(node, naming, replaced === undefined ? kind.implicitRole : null)) {
      if (value !== null) {
        set[attribute] = attribute === 'hidden' ? true : value
      }
    }
    if (replaced === undefined && kind.tag === 'button') {
      set['type'] = 'button'
    }
    return set
  })
</script>

{#snippet contents()}
  {#each node.content as content, index ('target' in content ? identity(content.target, naming) : `content ${String(index)}`)}
    {#if 'target' in content}
      <Part {item} {naming} node={content} {parts} {sources} />
    {:else if 'text' in content}
      {content.text}
    {:else if item !== undefined}
      {@render item(content.item)}
    {:else}
      {itemText(content, sources)}
    {/if}
  {/each}
{/snippet}

{#if replaced !== undefined}
  {@render replaced(attrs, { item: node.target.item, name }, contents)}
{:else}
  <svelte:element this={kind.tag} {...attrs}>{@render contents()}</svelte:element>
{/if}
