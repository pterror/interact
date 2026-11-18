import type { Own } from '../interact.js';
import type { PropsOf } from '@pterror/interact-core';
import type { select as source } from '@pterror/interact-core/select';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
/**
 * A select: the WAI-ARIA select-only combobox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), a trigger and a list, the
 * list in a popup against the trigger. Focus stays on the trigger, which names the active option by
 * `aria-activedescendant`, known from the list's `active` effects; the list is the windowed `list`, given the
 * select's value as its own, so it only reports what was chosen. The value follows the contract's rule: with
 * `value` in its props, a choice shows at once and is pending until the props confirm it or the app refuses it.
 * A character typed opens it and is the list's typeahead; Space is typed too while a prefix is being typed
 * (`until`). Given a visible label outside it (`label`), the trigger and the list are named by it, and a click
 * on it focuses the trigger. A mouse press on the trigger opens (or closes) it at once, and its release over an
 * option chooses that option, as a native select does; the click the press ends in is then not a toggle
 * (`pressed`). The option under the pointer is active.
 */
declare const Select: import("vue").DefineSetupFnComponent<Omit<Omit<Readonly<{
    disabled: boolean;
    label: string;
    placeholder: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: import("@pterror/interact-core/contract").SourceName;
    value: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}>, "value">, "source"> & {
    readonly source?: string;
} & {
    readonly items?: readonly import("@pterror/interact-core/components").Item[];
} & {
    readonly modelValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly defaultValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly "onUpdate:modelValue"?: (value: import("@pterror/interact-core/contract").Key | null, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {} & Readonly<{
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
    disabled: boolean;
    label: string;
    placeholder: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: import("@pterror/interact-core/contract").SourceName;
    value: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}>, "value">, "source"> & {
    readonly source?: string;
} & {
    readonly items?: readonly import("@pterror/interact-core/components").Item[];
} & {
    readonly modelValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly defaultValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly "onUpdate:modelValue"?: (value: import("@pterror/interact-core/contract").Key | null, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {} & Readonly<{
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
        own: Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown, 'source'>;
        parts: 'popover' | 'root' | 'trigger' | 'option' | 'list';
    }> | undefined;
};
export { Select };
