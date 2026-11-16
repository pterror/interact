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
    description: {
        events: never[];
        inside: {};
        props: string[];
        value: {
            empty: null;
            prop: string;
            wrapped: boolean;
        };
        widget: Readonly<{
            children: {
                list: Readonly<{
                    init: (props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    step: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, input: import("@pterror/interact-core/list").ListInput) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    view: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => Readonly<{
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
            props: {
                readonly list: (own: NoInfer<Readonly<{
                    open: boolean;
                    value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                    active: import("@pterror/interact-core/contract").Key | null;
                    label: string;
                    placeholder: string;
                    rows: import("@pterror/interact-core/contract").i32;
                    source: string;
                }>>) => Readonly<{
                    label: string;
                    rows: import("@pterror/interact-core/contract").i32;
                    source: string;
                    shown: boolean;
                    focusable: boolean;
                    selected: Readonly<{
                        value: import("@pterror/interact-core/contract").Key | null;
                    }> | null;
                }>;
            };
            init: (props: Readonly<{
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
                value: Readonly<{
                    value: import("@pterror/interact-core/contract").Key | null;
                }> | null;
            }>) => import("@pterror/interact-core/contract").Result<Readonly<{
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>, Readonly<{
                type: 'send';
                to: "list";
                input: unknown;
            }> | import("@pterror/interact-core/select").SelectEffect>;
            step: (own: Readonly<{
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>, input: import("@pterror/interact-core/select").SelectInput) => import("@pterror/interact-core/contract").Result<Readonly<{
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>, Readonly<{
                type: 'ask';
                id: import("@pterror/interact-core/contract").i53;
                source: string;
                ranks: readonly [import("@pterror/interact-core/contract").i32, import("@pterror/interact-core/contract").i32];
            }> | Readonly<{
                type: 'ask';
                id: import("@pterror/interact-core/contract").i53;
                source: string;
                locate: import("@pterror/interact-core/contract").Key;
                rows: import("@pterror/interact-core/contract").i32;
            }> | Readonly<{
                type: 'change';
                value: import("@pterror/interact-core/contract").Key | null;
                id: import("@pterror/interact-core/contract").i53;
            }> | Readonly<{
                type: 'preventDefault';
            }> | Readonly<{
                type: 'send';
                to: "list";
                input: unknown;
            }> | Readonly<{
                type: 'send';
                to: "list";
                input: unknown;
            }> | Readonly<{
                type: 'stopPropagation';
            }> | Readonly<{
                type: 'active';
                item: import("@pterror/interact-core/contract").Key | null;
            }>>;
            view: (own: NoInfer<Readonly<{
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>>, props: NoInfer<Readonly<{
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
                value: Readonly<{
                    value: import("@pterror/interact-core/contract").Key | null;
                }> | null;
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
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>, import("@pterror/interact-core/select").SelectEffect, {
                list: Readonly<{
                    init: (props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    step: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, input: import("@pterror/interact-core/list").ListInput) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    view: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => Readonly<{
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
            }>;
            capture: import("@pterror/interact-core/compose").InputHandlers<Readonly<{
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>, import("@pterror/interact-core/select").SelectEffect, {
                list: Readonly<{
                    init: (props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    step: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, input: import("@pterror/interact-core/list").ListInput) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    view: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => Readonly<{
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
            }, Readonly<{
                type: 'stopPropagation';
            }>>;
            bubble: import("@pterror/interact-core/compose").InputHandlers<Readonly<{
                open: boolean;
                value: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                active: import("@pterror/interact-core/contract").Key | null;
                label: string;
                placeholder: string;
                rows: import("@pterror/interact-core/contract").i32;
                source: string;
            }>, import("@pterror/interact-core/select").SelectEffect, {
                list: Readonly<{
                    init: (props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    step: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, input: import("@pterror/interact-core/list").ListInput) => import("@pterror/interact-core/contract").Result<Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, import("@pterror/interact-core/list").ListEffect>;
                    view: (state: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selection: import("@pterror/interact-core/pending").Pending<import("@pterror/interact-core/contract").Key | null>;
                        revision: import("@pterror/interact-core/contract").i53;
                        count: import("@pterror/interact-core/contract").i32 | null;
                        top: import("@pterror/interact-core/contract").i32;
                        from: import("@pterror/interact-core/contract").i32;
                        keys: readonly import("@pterror/interact-core/contract").Key[];
                        asked: import("@pterror/interact-core/contract").i53;
                        askedFor: import("@pterror/interact-core/list").Asked | null;
                        active: import("@pterror/interact-core/contract").Key | null;
                        activeRank: import("@pterror/interact-core/contract").i32 | null;
                        follow: 'key' | 'rank' | 'last';
                        rowSize: number | null;
                    }>, props: Readonly<{
                        label: string;
                        rows: import("@pterror/interact-core/contract").i32;
                        source: string;
                        shown: boolean;
                        focusable: boolean;
                        selected: Readonly<{
                            value: import("@pterror/interact-core/contract").Key | null;
                        }> | null;
                    }>) => Readonly<{
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
            }, never>;
        }>;
    };
    types: Readonly<{
        own: Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown>;
        parts: 'root' | 'trigger' | 'option' | 'list';
    }> | undefined;
};
export { Select };
