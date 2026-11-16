import { dialog as widget } from '@pterror/interact-core/dialog';
import type { AnyComponent, Own, OwnOf, PartsInside } from '../interact.js';
import type { PropsOf } from '@pterror/interact-core';
export type Widget = ReturnType<typeof widget>;
export type WidgetProps = PropsOf<Widget>;
/** @import { AnyComponent, Emits, Given, Own, OwnOf, PartsInside, Slots } from '../interact.js' */
/** @import { PropsOf } from '@pterror/interact-core' */
/** @import { SetupContext, SlotsType, VNodeChild } from 'vue' */
/** @typedef {ReturnType<typeof widget>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog
 * (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). `open` is always the app's, by the contract's rule:
 * Escape (one the content didn't take, heard as it bubbles from the content) and the close button close it at
 * once, pending, and emit `change` with `false`; the props confirm it, or `refused` opens it again. Opening
 * focuses the part the app names. Keeping focus inside while open, and giving it back on close, is what
 * `aria-modal` asks of the host.
 * @template {AnyComponent} Content
 * @param {Content} content - The widget inside
 * @param {Parameters<typeof widget>[1]} initialFocus - The part focused when it opens, from the dialog (`['content', ...]` is inside the content)
 * @returns The component
 */
declare function dialog<Content extends AnyComponent>(content: Content, initialFocus: Parameters<typeof widget>[1]): import("vue").DefineSetupFnComponent<Omit<Readonly<{
    title: string;
    closeLabel: string;
    open: boolean;
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
    description: {
        events: never[];
        inside: {
            content: Readonly<{
                widget: import("@pterror/interact-core/compose").AnyWidget;
                props: readonly string[];
                value: import("@pterror/interact-core/components").Bound | null;
                events: readonly string[];
                inside: Readonly<{
                    [prop: string]: import("@pterror/interact-core/components").Description;
                }>;
            }>;
        };
        props: string[];
        value: {
            empty: boolean;
            prop: string;
            wrapped: boolean;
        };
        widget: Readonly<{
            children: Readonly<{
                content: import("@pterror/interact-core/compose").AnyWidget;
            }>;
            props: {
                readonly content: (own: NoInfer<Readonly<{
                    title: string;
                    closeLabel: string;
                    open: import("@pterror/interact-core/pending").Pending<boolean>;
                    content: unknown;
                }>>) => unknown;
            };
            init: (props: Readonly<{
                title: string;
                closeLabel: string;
                open: boolean;
                content: unknown;
            }>) => import("@pterror/interact-core/contract").Result<Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>, Readonly<{
                type: 'send';
                to: "content";
                input: unknown;
            }> | import("@pterror/interact-core/dialog").DialogEffect>;
            step: (own: Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>, input: import("@pterror/interact-core/dialog").DialogInput<unknown>) => import("@pterror/interact-core/contract").Result<Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>, unknown>;
            view: (own: NoInfer<Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>>, props: NoInfer<Readonly<{
                title: string;
                closeLabel: string;
                open: boolean;
                content: unknown;
            }>>) => Readonly<{
                [name: string]: Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("@pterror/interact-core/contract").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    listens: readonly string[];
                    content: readonly import("@pterror/interact-core/contract").Content[];
                }> | ((item: import("@pterror/interact-core/contract").Key) => Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("@pterror/interact-core/contract").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    listens: readonly string[];
                    content: readonly import("@pterror/interact-core/contract").Content[];
                }>);
            }>;
            on: import("@pterror/interact-core/compose").OnHandlers<Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>, import("@pterror/interact-core/dialog").DialogEffect, Readonly<{
                content: import("@pterror/interact-core/compose").AnyWidget;
            }>>;
            capture: import("@pterror/interact-core/compose").InputHandlers<Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>, import("@pterror/interact-core/dialog").DialogEffect, Readonly<{
                content: import("@pterror/interact-core/compose").AnyWidget;
            }>, Readonly<{
                type: 'stopPropagation';
            }>>;
            bubble: import("@pterror/interact-core/compose").InputHandlers<Readonly<{
                title: string;
                closeLabel: string;
                open: import("@pterror/interact-core/pending").Pending<boolean>;
                content: unknown;
            }>, import("@pterror/interact-core/dialog").DialogEffect, Readonly<{
                content: import("@pterror/interact-core/compose").AnyWidget;
            }>, never>;
        }>;
    };
    types: Readonly<{
        own: Own<WidgetProps, 'open', WidgetProps['open'], never, Readonly<{
            content: OwnOf<Content>;
        }>>;
        parts: 'close' | 'root' | 'title' | PartsInside<Content, 'content'>;
    }> | undefined;
};
export { dialog };
