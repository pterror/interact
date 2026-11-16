import type { AnyComponent, Own, OwnOf, PartsInside } from '../interact.js';
import type { PropsOf } from '@pterror/interact-core';
import type { dialog as source } from '@pterror/interact-core/dialog';
export type Widget = ReturnType<typeof source>;
export type WidgetProps = PropsOf<Widget>;
/** @import { AnyComponent, Emits, Given, Own, OwnOf, PartsInside, Slots } from '../interact.js' */
/** @import { Description, PropsOf } from '@pterror/interact-core' */
/** @import { SetupContext, SlotsType, VNodeChild } from 'vue' */
/** @import { dialog as source } from '@pterror/interact-core/dialog' */
/** @typedef {ReturnType<typeof source>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog
 * (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), shown over everything else in an overlay. `open` is
 * always the app's, by the contract's rule: Escape (one the content didn't take, heard as it bubbles from the
 * content), the close button, and a press outside the dialog (on the overlay, unless `ignoreOutside`) close it
 * at once, pending, and emit `change` with `false`; the props confirm it, or `refused` opens it again. A press
 * outside closes it once it is released there, so what is under the overlay never takes the click. Opening
 * focuses the part the app names. Keeping focus inside while open, and giving it back on close, is what
 * `aria-modal` asks of the host.
 * @template {AnyComponent} Content
 * @param {Content} content - The widget inside
 * @param {Parameters<typeof source>[1]} initialFocus - The part focused when it opens, from the dialog (`['content', ...]` is inside the content)
 * @returns The component
 */
declare function dialog<Content extends AnyComponent>(content: Content, initialFocus: Parameters<typeof source>[1]): import("vue").DefineSetupFnComponent<Omit<Readonly<{
    title: string;
    closeLabel: string;
    open: boolean;
    ignoreOutside: boolean;
    content: unknown;
}>, "content" | "open"> & {
    readonly open?: boolean;
} & {
    readonly defaultOpen?: boolean;
} & {
    readonly "onUpdate:open"?: (value: boolean, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {} & Readonly<{
    content: OwnOf<Content>;
}> & Readonly<{
    name?: ((key: import("@pterror/interact-core").Key) => string) | undefined;
    sources?: Readonly<{
        [name: string]: import("@pterror/interact-core").Source;
    }> | undefined;
    words?: import("@pterror/interact-core").Words | undefined;
    naming?: import("@pterror/interact-core").Naming | undefined;
    translate?: ((input: Readonly<{
        [field: string]: unknown;
    }>) => Readonly<{
        [field: string]: unknown;
    }> | null) | undefined;
}> & Readonly<{
    [prop: string]: unknown;
}>, string[], {}, Omit<Readonly<{
    title: string;
    closeLabel: string;
    open: boolean;
    ignoreOutside: boolean;
    content: unknown;
}>, "content" | "open"> & {
    readonly open?: boolean;
} & {
    readonly defaultOpen?: boolean;
} & {
    readonly "onUpdate:open"?: (value: boolean, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {} & Readonly<{
    content: OwnOf<Content>;
}> & Readonly<{
    name?: ((key: import("@pterror/interact-core").Key) => string) | undefined;
    sources?: Readonly<{
        [name: string]: import("@pterror/interact-core").Source;
    }> | undefined;
    words?: import("@pterror/interact-core").Words | undefined;
    naming?: import("@pterror/interact-core").Naming | undefined;
    translate?: ((input: Readonly<{
        [field: string]: unknown;
    }>) => Readonly<{
        [field: string]: unknown;
    }> | null) | undefined;
}> & Readonly<{
    [prop: string]: unknown;
}> & {
    [x: `on${Capitalize<string>}`]: ((...args: any[]) => any) | undefined;
}, import("vue").PublicProps> & {
    description: Readonly<{
        widget: import("@pterror/interact-core/compose").AnyGenerated;
        props: readonly string[];
        value: import("@pterror/interact-core/components").Bound | null;
        events: readonly string[];
        inside: Readonly<{
            [prop: string]: import("@pterror/interact-core/components").Description;
        }>;
    }>;
    types: Readonly<{
        own: Own<WidgetProps, 'open', WidgetProps['open'], never, Readonly<{
            content: OwnOf<Content>;
        }>>;
        parts: 'close' | 'dialog' | 'root' | 'title' | PartsInside<Content, 'content'>;
    }> | undefined;
};
export { dialog };
