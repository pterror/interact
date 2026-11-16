import { list as widget } from '@pterror/interact-core/list';
import type { Own } from '../interact.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
export type Widget = typeof widget;
export type WidgetProps = PropsOf<Widget>;
/**
 * A listbox over a collection the host holds (on a server, say): the WAI-ARIA listbox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single selection, selection not following focus. It draws
 * a window of `rows` options and holds one more key each side of it, so every drawn option's neighbours are
 * known. Keys come from the host by `ask` about its `source`; only the answer to the latest ask is used, and
 * `changed` asks again. The window follows the active option, and, once an option's size is `measured`, the
 * list's `scroll` offset. Selection is the value, by the contract's rule: with `selected` in its props (not
 * `null`), a choice shows at once and is pending until the props confirm it or the app refuses it. The list
 * emits `active` whenever the active option it draws changes, so a parent can name it (`aria-activedescendant`)
 * without reading the list's state.
 */
declare const List: import("vue").DefineSetupFnComponent<Omit<Readonly<{
    label: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: string;
    shown: boolean;
    focusable: boolean;
    selected: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
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
    description: Readonly<{
        widget: import("@pterror/interact-core/compose").AnyWidget;
        props: readonly string[];
        value: import("@pterror/interact-core/components").Bound | null;
        events: readonly string[];
        inside: Readonly<{
            [prop: string]: import("@pterror/interact-core/components").Description;
        }>;
    }>;
    types: Readonly<{
        own: Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{
            type: 'active';
        }>>, unknown>;
        parts: 'option' | 'root';
    }> | undefined;
};
export { List };
