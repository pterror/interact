# @pterror/interact-markdown

Markdown for `@pterror/interact-editor`: a lossless grammar with HTML parsed inside it, the Look its editor and reader
draw it by, formatting read from the syntax tree, and pasted HTML as markdown.

```bash
npm install @pterror/interact-markdown @pterror/interact-editor @lezer/markdown @lezer/html @lezer/common
```

| Module                                                    | Does                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `markdownGrammar(extensions)`                             | lezer markdown with GFM, HTML tags of a block paired into elements, and the app's syntax |
| `markdownLook(html)`                                      | how each node is drawn; every element with attributes from the text goes through `html`  |
| `toggleStyle(style)`, `hasStyle(state, style)`            | bold, italic, strikethrough, code and underline, and whether the selection is in one     |
| `heading`, `quote`, `list`, `codeBlock`, `link`           | commands on the lines or words the selection touches                                     |
| `inHeading`, `inQuote`, `inList`, `inCodeBlock`, `inLink` | whether the selection is in one, for a tool's `on`                                       |
| `htmlToMarkdown(html, shows)`                             | HTML as markdown, keeping as HTML each block whose markdown would show other text        |
| `markdownPaste(options)`                                  | pasting HTML as markdown, or whichever text the app chooses                              |

`html(name, attributes, content)` is the app's policy: what is allowed, and how classes and styles are rewritten. It
answers the element to draw, or none to draw the source as text.

`docs/design.md` in the repository, "Editor", is the design.
