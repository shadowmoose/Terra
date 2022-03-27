import React from "react";
import UITool from "./ui-tool";
import PenMiddleware from "../game/middleware/pen-events";
import GameController from "../game/controllers/game";
import SpritePicker from "../ui-components/spritepicker";
import { Sprite } from "../game/util/sprite-loading";
import TerrainIcon from '@material-ui/icons/Terrain';
import {observer} from "mobx-react-lite";
import Terrain from "../game/controllers/terrain";
import {Slider, Typography} from "@material-ui/core";

export default class UIPenTool extends UITool {
    readonly icon: JSX.Element = <TerrainIcon />;
    readonly name: string = 'Terrain';
    readonly middleware: PenMiddleware;
    private searchTerm: string = 'ground';

    constructor(controller: GameController) {
        super(controller);
        this.middleware = new PenMiddleware(controller.terrain, true);
    }

    getControlUI(forMobile: boolean): JSX.Element {
        return <PenControlInterface
            terrain={this.controller.terrain}
            term={this.searchTerm}
            setSearch={(term: string) => this.searchTerm = term}
            pen={this.middleware}
        />
    }

    register(): any {
        console.log('Mounted pen tool.');
        this.middleware.attach();
    }

    unregister(): any {
       this.middleware.eject();
       console.log('Unmounted pen tool.');
    }

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return isHost;
    }
}


const PenControlInterface = observer((props: {terrain: Terrain, setSearch: Function, term: string, pen: PenMiddleware}) => {
    return <div className={'cont'} >
        <PenSizeSlider pen={props.pen}/>
        <SpritePicker
            onSelect={(sp: Sprite) => props.terrain.selectedSprite = sp}
            onSearch={props.setSearch}
            defaultTerm={props.term}
            selected={props.terrain.selectedSprite}
            canAnimate={false}
            forEntity={false}
        />
    </div>
});

const PenSizeSlider = observer((props: {pen: PenMiddleware}) => {
    return <div>
        <Typography id="discrete-slider" gutterBottom>
            Pen Size: {props.pen.penSize}
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
