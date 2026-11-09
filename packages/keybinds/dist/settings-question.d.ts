/**
 * The question a settings panel asks when a binding is another id's, a `data-keybinds=conflict` span (`role=alert`):
 * whose it is, and buttons to replace that one (`data-keybinds=replace`) or cancel (`data-keybinds=cancel`).
 */
export type SettingsQuestionOptions = Readonly<{
    labelOf: (id: string) => string;
    accept: () => void;
    cancel: () => void;
}>;
/**
 * Makes the question
 * @param {SettingsQuestionOptions} options - An id's label; and answering (conflictQuestion()'s)
 * @returns {(question: Readonly<{ taken: string }>) => HTMLElement} The question, for the id that has the binding
 */
declare function settingsQuestion({ accept, cancel, labelOf }: SettingsQuestionOptions): (question: Readonly<{
    taken: string;
}>) => HTMLElement;
export { settingsQuestion };
