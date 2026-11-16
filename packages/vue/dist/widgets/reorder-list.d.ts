import { reorderList as widget } from '@pterror/interact-core/reorder';
import type { Own } from '../interact.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
export type Widget = typeof widget;
export type WidgetProps = PropsOf<Widget>;
/**
 * A listbox whose options can be reordered, by dragging with a pointer or by Alt+ArrowUp and Alt+ArrowDown on
 * the active option, as in the WAI-ARIA listbox with rearrangeable options
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/). It is the list with its
 * step and view wrapped: what it handles first is the drag and the move keys, and everything else is the list's.
 * The order is the collection's, by the contract's rule: a move shows at once, is emitted as `move` with an id,
 * and stays pending, applied over the keys the host answers with, until the host has it (`confirmed`, then the
 * next answer holds it) or refuses it (`refused`, which undoes it). Every move is made against the order shown,
 * pending moves included. ARIA has no word for a dragged item or a drop place (`aria-grabbed` and
 * `aria-dropeffect` are deprecated), so they are `data` states, and a move is announced. A drag starts once the
 * pointer has moved `dragDistance` (in the target's units) from where it was pressed, and lands by which option
 * the pointer is over: after it when that option is later than the dragged one, before it when earlier.
 */
declare const ReorderList: import("vue").DefineSetupFnComponent<Omit<Readonly<{
    label: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: string;
    shown: boolean;
    focusable: boolean;
    selected: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}> & Readonly<{
    keyshortcuts: string;
    dragDistance: number;
}>, "selected"> & {
    readonly selected?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly defaultSelected?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly "onUpdate:selected"?: (value: import("@pterror/interact-core/contract").Key | null, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {
    readonly onActive?: (effect: Readonly<{
        type: 'active';
        item: import("@pterror/interact-core/contract").Key | null;
    }>) => void;
} & Readonly<{
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
    label: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: string;
    shown: boolean;
    focusable: boolean;
    selected: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}> & Readonly<{
    keyshortcuts: string;
    dragDistance: number;
}>, "selected"> & {
    readonly selected?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly defaultSelected?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly "onUpdate:selected"?: (value: import("@pterror/interact-core/contract").Key | null, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {
    readonly onActive?: (effect: Readonly<{
        type: 'active';
        item: import("@pterror/interact-core/contract").Key | null;
    }>) => void;
} & Readonly<{
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
        events: string[];
        inside: {};
        props: string[];
        value: {
            empty: null;
            prop: string;
            wrapped: boolean;
        };
        widget: Readonly<{
            init: (props: import("@pterror/interact-core/reorder").ReorderProps) => import("@pterror/interact-core/contract").Result<import("@pterror/interact-core/reorder").ReorderState, import("@pterror/interact-core/reorder").ReorderEffect>;
            step: (state: import("@pterror/interact-core/reorder").ReorderState, input: import("@pterror/interact-core/reorder").ReorderInput) => import("@pterror/interact-core/contract").Result<import("@pterror/interact-core/reorder").ReorderState, import("@pterror/interact-core/reorder").ReorderEffect>;
            view: (state: import("@pterror/interact-core/reorder").ReorderState, props: import("@pterror/interact-core/reorder").ReorderProps) => Readonly<{
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
        }>;
    };
    types: Readonly<{
        own: Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{
            type: 'active';
        }>>, unknown>;
        parts: 'option' | 'root';
    }> | undefined;
};
export { ReorderList };
