import React from "react";
import UITool from "./ui-tool";
import PenMiddleware from "../game/middleware/pen-events";
import GameController from "../game/controllers/game";
import ClearIcon from '@material-ui/icons/Clear';
import {observer} from "mobx-react-lite";
import {Slider, Typography} from "@material-ui/core";

export default class UIEraserTool extends UITool {
    readonly icon: JSX.Element = <ClearIcon />;
    readonly name: string = 'Eraser';
    readonly middleware: PenMiddleware;

    constructor(controller: GameController) {
        super(controller);
        this.middleware = new PenMiddleware(controller.terrain, false);
    }

    getControlUI(forMobile: boolean): JSX.Element|null {
        return <EraserSizeSlider pen={this.middleware}/>
    }

    register(): any {
        this.middleware.attach();
        console.log('Mounted eraser tool.')
    }

    unregister(): any {
        this.middleware.eject();
        console.log('Unmounted eraser tool.')
    }

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return forMobile && isHost;
    }
}

const EraserSizeSlider = observer((props: {pen: PenMiddleware}) => {
    console.log('PS:', props.pen.penSize)

    return <div>
        <Typography id="discrete-slider" gutterBottom>
            Eraser Size: {props.pen.penSize}
        </Typography>
        <Slider
            value={props.pen.penSize}
            getAriaValueText={() => `${props.pen.penSize}`}
            aria-labelledby="discrete-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={8}
            onChange={ (event: any, newValue: any)=> props.pen.setPenSize(newValue)}
        />
    </div>
});
