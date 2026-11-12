/**
 * A text drawn for reading: a walk over its syntax tree into DOM, by the same Look the editor draws with, leaving the
 * marks out. Text is drawn exactly as written (the app's text class keeps whitespace, `white-space: pre-wrap`, as the
 * editor's does), so each text node is a run of the source and every place in the DOM maps back to a source position.
 * The reader also leaves out the whitespace that only separates a mark from the text of its line ("# Title",
 * "> quote"), and the line break of a line holding nothing but marks (a code fence).
 */
import { TreeFragment } from '@lezer/common';
export type SyntaxNode = import('@lezer/common').SyntaxNode;
export type Look = import('./look.js').Look;
export type Piece = import('./look.js').Piece;
export type Rule = import('./look.js').Rule;
export type Grammar = Readonly<{
    parse: (text: string, fragments?: readonly TreeFragment[]) => import('@lezer/common').Tree;
}>;
export type Range = Readonly<{
    from: number;
    to: number;
    class: string;
    attributes?: Readonly<Record<string, string>>;
}>;
export type Asked = Readonly<{
    read: import('./look.js').Read;
    tree: import('@lezer/common').Tree;
}>;
export type Overlay = Readonly<{
    ranges: (from: number, to: number, text: Asked) => import('./later.js').Later<readonly Range[]>;
    watch: (listener: (range?: Readonly<{
        from: number;
        to: number;
    }>) => void) => () => void;
}>;
export type ReaderOptions = Readonly<{
    grammar: Grammar;
    look: Look;
    overlays?: readonly Overlay[];
    textClass: string;
}>;
export type Reader = Readonly<{
    element: HTMLElement;
    show: (text: string) => void;
    positionAt: (node: Node, offset: number) => number | undefined;
    stop: () => void;
}>;
export type Part = Readonly<{
    block: SyntaxNode;
    rule: Rule;
} | {
    from: number;
    to: number;
}>;
export type DrawnPiece = Readonly<{
    piece: Piece;
    element: HTMLElement;
}>;
export type Drawn = Readonly<{
    key: string;
    from: number;
    to: number;
    nodes: readonly ChildNode[];
    pieces: readonly DrawnPiece[];
}>;
export type Span = Readonly<{
    from: number;
    to: number;
}>;
export type Wrapper = Readonly<{
    from: number;
    to: number;
    element: string;
    class: string | undefined;
    attributes: Readonly<Record<string, string>>;
}>;
/**
 * Draws texts for reading
 * @param {ReaderOptions} options - The grammar, the look, the overlays drawn on the text, and the class the text takes
 * @returns {Reader} The element it draws into, showing a text, the source position of a place in the element, and
 *   stopping
 */
declare function reader({ grammar, look, overlays, textClass }: ReaderOptions): Reader;
export { reader };
