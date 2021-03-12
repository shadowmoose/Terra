import React from "react";
import UITool from "./ui-tool";
import ControlCameraIcon from '@material-ui/icons/ControlCamera';
import EntityMiddleware from "../game/middleware/entity-events";
import GameController from "../game/controllers/game";

export default class UICameraTool extends UITool {
    readonly icon: JSX.Element = <ControlCameraIcon />;
    readonly name: string = 'Camera';
    private readonly middleware: EntityMiddleware;

    constructor(controller: GameController) {
        super(controller);
        this.middleware = new EntityMiddleware(controller.entities);
    }

    getControlUI(forMobile: boolean): JSX.Element|null {
        return null;
    }

    register(): any {
        console.log('Mounted camera-entity tool.');
        this.middleware.attach();
    }

    unregister(): any {
        console.log('Unmounted camera-entity tool.');
        this.middleware.eject();
    }

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return true;
    }
}
