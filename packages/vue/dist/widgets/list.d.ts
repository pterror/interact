import type { Own } from '../interact.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
import type { list as source } from '@pterror/interact-core/list';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
/**
 * A listbox over a collection the host holds (on a server, say): the WAI-ARIA listbox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single selection, selection not following focus. It draws
 * a window of `rows` options and holds one more key each side of it, so every drawn option's neighbours are
 * known. Keys come from the host by `ask` about its `source`; only the answer to the latest ask is used, and
 * `changed` asks again. The window follows the active option, and, once an option's size is `measured`, the
 * list's `scroll` offset. Characters typed are typeahead: the host finds the option they start (`ask` with
 * `find`), and only the answer to the latest find is used. Shown with nothing selected and nothing active, or
 * focused so, the first option is active. Given a visible label outside it (`label`), it is named by it. With
 * `hover`, the option under the pointer becomes active. Selection is the value, by the contract's rule: with
 * `selected` in its props (not `null`), a choice shows at once and is pending until the props confirm it or the
 * app refuses it. The list emits `active` whenever the active option it draws changes, so a parent can name it
 * (`aria-activedescendant`) without reading the list's state.
 */
declare const List: import("vue").DefineSetupFnComponent<Omit<Omit<Readonly<{
    label: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: import("@pterror/interact-core/contract").SourceName;
    shown: boolean;
    focusable: boolean;
    hover: boolean;
    selected: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}>, "selected">, "source"> & {
    readonly source?: string;
} & {
    readonly items?: readonly import("@pterror/interact-core/components").Item[];
} & {
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
    itemName?: ((key: import("@pterror/interact-core").Key) => string) | undefined;
    name?: string | undefined;
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
    outside?: Readonly<{
        [name: string]: import("@pterror/interact-core").OutsideGiven;
    }> | undefined;
}> & Readonly<{
    [prop: string]: unknown;
}>, string[], {}, Omit<Omit<Readonly<{
    label: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: import("@pterror/interact-core/contract").SourceName;
    shown: boolean;
    focusable: boolean;
    hover: boolean;
    selected: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}>, "selected">, "source"> & {
    readonly source?: string;
} & {
    readonly items?: readonly import("@pterror/interact-core/components").Item[];
} & {
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
    itemName?: ((key: import("@pterror/interact-core").Key) => string) | undefined;
    name?: string | undefined;
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
    outside?: Readonly<{
        [name: string]: import("@pterror/interact-core").OutsideGiven;
    }> | undefined;
}> & Readonly<{
    [prop: string]: unknown;
}> & {
    [x: `on${Capitalize<string>}`]: ((...args: any[]) => any) | undefined;
}, import("vue").PublicProps> & {
    description: Readonly<{
        widget: import("@pterror/interact-core/compose").AnyGenerated;
        props: readonly string[];
        sources: readonly string[];
        value: import("@pterror/interact-core/components").Bound | null;
        events: readonly string[];
        inside: Readonly<{
            [prop: string]: import("@pterror/interact-core/components").Description;
        }>;
    }>;
    types: Readonly<{
        own: Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{
            type: 'active';
        }>>, unknown, 'source'>;
        parts: 'option' | 'root';
    }> | undefined;
};
export { List };
