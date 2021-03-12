import React from "react";
import UITool from "./ui-tool";
import ExploreIcon from '@material-ui/icons/Explore';
import GameController from "../game/controllers/game";
import MeasureMiddleware from "../game/middleware/measure-events";
import {observer} from "mobx-react-lite";
import {Button, FormControlLabel, Radio} from "@material-ui/core";
import RadioGroup from "@material-ui/core/RadioGroup";
import {SHAPE_TYPES} from "../game/renderer/ui-components/ui-shape";
import MeasureHandler from "../game/net/handlers/measure-handler";

export default class UIMeasuretool extends UITool {
    readonly icon: JSX.Element = <ExploreIcon />;
    readonly name: string = 'Measure';
    private readonly middleware: MeasureMiddleware;

    constructor(controller: GameController) {
        super(controller);
        this.middleware = new MeasureMiddleware(controller.entities);
    }

    getControlUI(forMobile: boolean): JSX.Element|null {
        return <MeasureUI measure={this.middleware} />
    }

    register(): any {
        console.log('Mounted measure tool.');
        this.middleware.attach();
    }

    unregister(): any {
        console.log('Unmounted measure tool.');
        this.middleware.eject();
    }

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return true;
    }
}

const MeasureUI = observer((props: {measure: MeasureMiddleware}) => {
    const handleChange = (event: any) => {
        props.measure.setShape(event.target.value);
    };

    const shapes = Object.values(SHAPE_TYPES);
    const opts = shapes.map(type => {
        return <FormControlLabel value={type} control={<Radio />} label={type} key={`opt-${type}`}/>
    })

    return <div>
        <h2>Measure {props.measure.size ? `(${props.measure.size*5}ft)` : ''}</h2>
        <RadioGroup aria-label="shapes" name="shape-select" value={props.measure.shapeType} onChange={handleChange}>
            {opts}
        </RadioGroup>
        <Button
            variant="contained"
            color="primary"
            onClick={()=>{
                if (props.measure.measure) {
                    MeasureHandler.sendMeasure(props.measure.measure, true);
                    props.measure.sentUpdate = true;
                }
            }}
            disabled={!props.measure.size || props.measure.sentUpdate}
        >
            Send Measurement
        </Button>
    </div>
});
