import { menu as widget } from '@pterror/interact-core/menu';
import type { Own } from '../interact.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
export type Widget = typeof widget;
export type WidgetProps = PropsOf<Widget>;
/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/),
 * focus moved to each item in turn. Items are few and the app's, so they come in the props with their text,
 * which typeahead reads. Choosing an item emits `activate`; disabled items are moved to but not chosen.
 */
declare const Menu: import("vue").DefineSetupFnComponent<Omit<Readonly<{
    label: string;
    items: readonly import("@pterror/interact-core/menu").MenuItem[];
}>, never> & {
    readonly onActivate?: (effect: Readonly<{
        type: 'activate';
        item: import("@pterror/interact-core/contract").Key;
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
    items: readonly import("@pterror/interact-core/menu").MenuItem[];
}>, never> & {
    readonly onActivate?: (effect: Readonly<{
        type: 'activate';
        item: import("@pterror/interact-core/contract").Key;
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
        own: Own<WidgetProps, never, never, Extract<EffectOf<Widget>, Readonly<{
            type: 'activate';
        }>>, unknown>;
        parts: 'button' | 'item' | 'menu' | 'root';
    }> | undefined;
};
export { Menu };
