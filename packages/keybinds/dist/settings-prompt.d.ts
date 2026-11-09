/**
 * What a settings panel shows in place of the binding being recorded, a `data-keybinds=prompt` span: what to do, or
 * the steps so far; and the switches for what is captured, for the syntax that is on and a press's input (not an
 * axis): Release (`data-keybinds=record-release`), Hold and Tap (`record-hold`, `record-tap`), several steps
 * (`record-steps`), each `aria-pressed`, and Done once there are steps (`record-done`).
 */
export type Suffix = '' | ':hold' | ':tap' | ':up';
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Recorded<S extends Readonly<{
    field: Field;
}>> = Readonly<{
    slot: S;
    suffix: Suffix;
    steps?: readonly string[] | undefined;
}>;
export type SettingsPromptOptions<S extends Readonly<{
    field: Field;
}>> = Readonly<{
    prompt: (slot: S, release: boolean) => string;
    parts: (slot: S, binding: string) => readonly string[];
    recording: Readonly<{
        capture: (suffix: ':hold' | ':tap' | ':up') => void;
        toggleSteps: () => void;
        finish: () => void;
    }>;
    releases?: boolean;
    holds?: boolean;
    sequences?: boolean;
}>;
/**
 * Makes prompts
 * @template {Readonly<{ field: Field }>} S
 * @param {SettingsPromptOptions<S>} options - What to do, for a slot's input (a release, if asked); a binding's
 *   display parts; the recording (recording()); and which syntax is on
 * @returns {(recorded: Recorded<S>) => HTMLElement} The prompt for what is being recorded
 */
declare function settingsPrompt<S extends Readonly<{
    field: Field;
}>>({ holds, parts, prompt, recording, releases, sequences }: SettingsPromptOptions<S>): (recorded: Recorded<S>) => HTMLElement;
export { settingsPrompt };
