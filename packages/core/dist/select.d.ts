/**
 * A select: the WAI-ARIA select-only combobox (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/),
 * a trigger and a list, the list in a popup against the trigger. Focus stays on the trigger, which names the active option by `aria-activedescendant`, known
 * from the list's `active` effects; the list is the windowed `list`, given the select's value as its own, so it only
 * reports what was chosen. The value follows the contract's rule: with `value` in its props, a choice shows at once
 * and is pending until the props confirm it or the app refuses it. A character typed opens it and is the list's
 * typeahead; Space is typed too while a prefix is being typed (`until`). Given a visible label outside it (`label`),
 * the trigger and the list are named by it, and a click on it focuses the trigger. A mouse press on the trigger opens
 * (or closes) it at once, and its release over an option chooses that option, as a native select does; the click the
 * press ends in is then not a toggle (`pressed`). The option under the pointer is active.
 */
import type { Blur, Change, Click, i32, Key, KeyDown, Pointer, PreventDefault, PropsInput, Refused, Result, SourceName, View } from './contract.js';
import type { Send, StopPropagation } from './compose.js';
import type { Pending } from './pending.js';
export type SelectProps = Readonly<{
    disabled: boolean;
    label: string;
    placeholder: string;
    rows: i32;
    source: SourceName;
    value: Readonly<{
        value: Key | null;
    }> | null;
}>;
export type SelectOwn = Readonly<{
    open: boolean;
    value: Pending<Key | null>;
    active: Key | null;
    disabled: boolean;
    label: string;
    placeholder: string;
    rows: i32;
    source: string;
    until: number;
    pressed: boolean;
}>;
export type SelectInput = KeyDown | Click | Blur | Pointer | PropsInput<SelectProps> | Refused;
export type SelectEffect = Change<Key | null> | PreventDefault | Send<'list'> | StopPropagation;
/**
 * The select's parts
 * @param {SelectOwn} own - The select
 * @returns {View} Its parts
 */
declare function view(own: SelectOwn): View;
declare const select: Readonly<{
    children: {
        list: Readonly<{
            init: (props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            step: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, input: import("./list.js").ListInput) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            view: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Readonly<{
                [name: string]: Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }> | ((item: Key) => Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }>);
            }>;
        }>;
    };
    props: {
        readonly list: (own: NoInfer<Readonly<{
            open: boolean;
            value: Pending<Key | null>;
            active: Key | null;
            disabled: boolean;
            label: string;
            placeholder: string;
            rows: i32;
            source: string;
            until: number;
            pressed: boolean;
        }>>) => Readonly<{
            label: string;
            rows: i32;
            source: SourceName;
            shown: boolean;
            focusable: boolean;
            hover: boolean;
            selected: Readonly<{
                value: Key | null;
            }> | null;
        }>;
    };
    init: (props: Readonly<{
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: SourceName;
        value: Readonly<{
            value: Key | null;
        }> | null;
    }>) => Result<Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>, Readonly<{
        type: 'send';
        to: "list";
        input: unknown;
    }> | SelectEffect>;
    step: (own: Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>, input: SelectInput) => Result<Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>, Readonly<{
        type: 'ask';
        id: import("./contract.js").i53;
        source: string;
        ranks: readonly [i32, i32];
    }> | Readonly<{
        type: 'ask';
        id: import("./contract.js").i53;
        source: string;
        locate: Key;
        rows: i32;
    }> | Readonly<{
        type: 'ask';
        id: import("./contract.js").i53;
        source: string;
        find: string;
        at: Key | null;
        next: boolean;
    }> | Readonly<{
        type: 'wake';
        at: number;
    }> | Readonly<{
        type: 'change';
        value: Key | null;
        id: import("./contract.js").i53;
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
        item: Key | null;
    }>>;
    view: (own: NoInfer<Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>>, props: NoInfer<Readonly<{
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: SourceName;
        value: Readonly<{
            value: Key | null;
        }> | null;
    }>>) => Readonly<{
        [name: string]: Readonly<{
            role: string | null;
            aria: Readonly<{
                [name: string]: import("./contract.js").AriaValue;
            }>;
            data: Readonly<{
                [name: string]: string | boolean | null;
            }>;
            tabindex: number | null;
            hidden: boolean;
            popup: import("./contract.js").Popup | null;
            listens: readonly string[];
            content: readonly import("./contract.js").Content[];
        }> | ((item: Key) => Readonly<{
            role: string | null;
            aria: Readonly<{
                [name: string]: import("./contract.js").AriaValue;
            }>;
            data: Readonly<{
                [name: string]: string | boolean | null;
            }>;
            tabindex: number | null;
            hidden: boolean;
            popup: import("./contract.js").Popup | null;
            listens: readonly string[];
            content: readonly import("./contract.js").Content[];
        }>);
    }>;
    on: import("./compose.js").OnHandlers<Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>, SelectEffect, {
        list: Readonly<{
            init: (props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            step: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, input: import("./list.js").ListInput) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            view: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Readonly<{
                [name: string]: Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }> | ((item: Key) => Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }>);
            }>;
        }>;
    }>;
    capture: import("./compose.js").InputHandlers<Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>, SelectEffect, {
        list: Readonly<{
            init: (props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            step: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, input: import("./list.js").ListInput) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            view: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Readonly<{
                [name: string]: Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }> | ((item: Key) => Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }>);
            }>;
        }>;
    }, Readonly<{
        type: 'stopPropagation';
    }>>;
    bubble: import("./compose.js").InputHandlers<Readonly<{
        open: boolean;
        value: Pending<Key | null>;
        active: Key | null;
        disabled: boolean;
        label: string;
        placeholder: string;
        rows: i32;
        source: string;
        until: number;
        pressed: boolean;
    }>, SelectEffect, {
        list: Readonly<{
            init: (props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            step: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, input: import("./list.js").ListInput) => Result<Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, import("./list.js").ListEffect>;
            view: (state: Readonly<{
                label: string;
                rows: i32;
                source: string;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selection: Pending<Key | null>;
                revision: import("./contract.js").i53;
                count: i32 | null;
                top: i32;
                from: i32;
                keys: readonly Key[];
                asked: import("./contract.js").i53;
                askedFor: import("./list.js").Asked | null;
                active: Key | null;
                activeRank: i32 | null;
                follow: 'key' | 'rank' | 'last';
                rowSize: number | null;
                prefix: string;
                until: number;
                sought: import("./contract.js").i53;
            }>, props: Readonly<{
                label: string;
                rows: i32;
                source: SourceName;
                shown: boolean;
                focusable: boolean;
                hover: boolean;
                selected: Readonly<{
                    value: Key | null;
                }> | null;
            }>) => Readonly<{
                [name: string]: Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }> | ((item: Key) => Readonly<{
                    role: string | null;
                    aria: Readonly<{
                        [name: string]: import("./contract.js").AriaValue;
                    }>;
                    data: Readonly<{
                        [name: string]: string | boolean | null;
                    }>;
                    tabindex: number | null;
                    hidden: boolean;
                    popup: import("./contract.js").Popup | null;
                    listens: readonly string[];
                    content: readonly import("./contract.js").Content[];
                }>);
            }>;
        }>;
    }, never>;
}>;
export { select, view as selectView };
