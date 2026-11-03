/**
 * Command buttons: every element with `data-command="<id>"` under a root runs that command when clicked, and is
 * disabled while the command doesn't apply.
 */
export type ButtonCommands = Readonly<{
    applies: (id: string) => boolean;
    run: (id: string, event?: Event) => boolean;
}>;
/**
 * What buttons need from the hub: whether a command applies now, and running it
 * @typedef {Readonly<{ applies: (id: string) => boolean, run: (id: string, event?: Event) => boolean }>} ButtonCommands
 */
/** The command buttons under every root a hub keeps in step */
declare class CommandButtons {
    #private;
    /**
     * Buttons under no root yet
     * @param {ButtonCommands} commands - Whether each command applies, and running it
     */
    constructor(commands: ButtonCommands);
    /**
     * Starts running the commands of the buttons under a root, and shows which apply
     * @param {Element} root - Where the buttons are
     * @returns {() => void} A function that stops
     */
    bind(root: Element): () => void;
    /**
     * Runs the command of a button clicked
     * @param {Event} event - A click under a root
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /**
     * Disables each button whose command doesn't apply now, and enables the rest, under every root
     * @returns {void}
     */
    paint(): void;
    /**
     * Stops every root's buttons
     * @returns {void}
     */
    stop(): void;
}
export { CommandButtons };
