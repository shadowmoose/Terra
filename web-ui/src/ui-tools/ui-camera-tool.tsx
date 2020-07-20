import React from "react";
import UITool from "./ui-tool";
import ControlCameraIcon from '@material-ui/icons/ControlCamera';

export default class UICameraTool extends UITool {
    readonly icon: JSX.Element = <ControlCameraIcon />;
    readonly name: string = 'Camera';

    getControlUI(forMobile: boolean): JSX.Element|null {
        return null;
    }

    register(): any {}

    unregister(): any {}

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return true;
    }
}
