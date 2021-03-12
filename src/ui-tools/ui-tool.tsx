import GameController from "../game/controllers/game";

/**
 * A wrapper to connect the UI controls to the actual game, typically through middleware.
 * The interfaces generated should be agnostic of the platform, for maximum compatibility.
 */
export default abstract class UITool {
    public readonly abstract name: string;
    public readonly abstract icon: JSX.Element;
    protected readonly controller: GameController;

    public constructor(controller: GameController) {
        this.controller = controller;
    }

    abstract getControlUI(forMobile: boolean): JSX.Element|null;
    abstract register(): any;
    abstract unregister(): any;
    abstract isOption(forMobile: boolean, isHost: boolean): boolean;
}
