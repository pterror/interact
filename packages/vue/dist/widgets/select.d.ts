import { select as widget } from '@pterror/interact-core/select';
import type { Own } from '../interact.js';
import type { PropsOf } from '@pterror/interact-core';
export type Widget = typeof widget;
export type WidgetProps = PropsOf<Widget>;
/**
 * A select: the WAI-ARIA select-only combobox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), a trigger and a list.
 * Focus stays on the trigger, which names the active option by `aria-activedescendant`, known from the list's
 * `active` effects; the list is the windowed `list`, given the select's value as its own, so it only reports
 * what was chosen. The value follows the contract's rule: with `value` in its props, a choice shows at once and
 * is pending until the props confirm it or the app refuses it.
 */
declare const Select: import("vue").DefineSetupFnComponent<Omit<Readonly<{
    label: string;
    placeholder: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: string;
    value: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}>, "value"> & {
    readonly modelValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly defaultValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly "onUpdate:modelValue"?: (value: import("@pterror/interact-core/contract").Key | null, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {} & Readonly<{
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
    placeholder: string;
    rows: import("@pterror/interact-core/contract").i32;
    source: string;
    value: Readonly<{
        value: import("@pterror/interact-core/contract").Key | null;
    }> | null;
}>, "value"> & {
    readonly modelValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly defaultValue?: import("@pterror/interact-core/contract").Key | null;
} & {
    readonly "onUpdate:modelValue"?: (value: import("@pterror/interact-core/contract").Key | null, change: Readonly<{
        refuse: () => void;
    }>) => void;
} & {} & Readonly<{
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
        own: Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown>;
        parts: 'root' | 'trigger' | 'option' | 'list';
    }> | undefined;
};
export { Select };
