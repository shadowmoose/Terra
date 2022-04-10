import {observer} from "mobx-react-lite";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Fab,
    FormControlLabel, Slider,
    Switch,
    Tooltip,
    Typography
} from "@material-ui/core";
import SettingsIcon from '@material-ui/icons/Settings';
import React from "react";
import GameController from "../game/controllers/game";
import * as GRID from '../game/renderer/ui-components/ui-grid';
import * as LS from '../game/data/local-storage';
import EntityLayer from "../game/controllers/entities";
import hotkeys from "hotkeys-js";
import MeasureHandler from "../game/net/handlers/measure-handler";
import * as RENDER from '../game/renderer';
import {Meta, metadata} from "../game/db/metadata-db";
import {InputDialog} from "./prompts";


export const PreferencesButton = observer( (props: {controller: GameController}) => {
    const [modalOpen, setModalOpen] = React.useState(false);

    React.useEffect(() => {
        GRID.setVisible(LS.get(LS.STORAGE.SHOW_GRID, true));
        MeasureHandler.showMeasures(LS.get(LS.STORAGE.SHOW_MEASURES, true));
        props.controller.entities.setDisplayNamePlates(LS.get(LS.STORAGE.SHOW_NAMES, true));

        hotkeys('ctrl+p', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setModalOpen(true);
        });

        return () => {
            hotkeys.unbind('ctrl+p');
        }
    }, [props.controller.entities]);

    return <div style={{ width: '56px' }}>
        <Tooltip
            title='Preferences'
            style={{
                pointerEvents: 'auto',
            }}
        >
            <span>
                <Fab
                    color="primary"
                    onClick={() => setModalOpen(true)}
                    disabled={modalOpen}
                >
                    <SettingsIcon />
                </Fab>
            </span>
        </Tooltip>

        <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
            <Tooltip
                title={"Built from commit ID: " + (process.env.REACT_APP_CURRENT_SHA || 'Unknown')}
                style={{
                    pointerEvents: 'auto',
                }}
            >
                <DialogTitle style={{textAlign: "center"}}>User Settings</DialogTitle>
            </Tooltip>

            <Button
                onClick={() => {
                    // @ts-ignore
                    window.location = window.location.toString().replace(window.location.hash, '');
                }}
                color="secondary"
                variant={"outlined"}
                style={{marginTop: '10px', marginBottom: '10px', width: '100%'}}
            >
                Disconnect
            </Button>

            <DialogContent style={{textAlign: "center", margin: 0, padding: 0}}>
                <p style={{color: 'gray'}}>
                    <Tooltip title={(process.env.REACT_APP_COMMIT_MESSAGE || 'Unknown')}>
                        <p>
                            <a
                                href={`https://github.com/shadowmoose/Terra/commit/${process.env.REACT_APP_CURRENT_SHA || ''}`}
                                target={"_blank"} style={{textDecoration: 'none'}}
                                rel="noopener noreferrer"
                            >
                                {"Build ID: " + (process.env.REACT_APP_CURRENT_SHA || 'Unknown')}
                            </a>
                        </p>
                    </Tooltip>
                </p>

                <Typography variant="h6" component="h6" gutterBottom>Display Options</Typography>
            </DialogContent>

            <DialogContent style={{textAlign: "left"}}>
                <GridSwitch />
                <NameSwitch entities={props.controller.entities} />
                <MeasureSwitch />
                <NameChange />
                <ZoomSlider />
            </DialogContent>
        </Dialog>
    </div>
});


const GridSwitch = () => {
    const [useGrid, setGrid] = React.useState(LS.get(LS.STORAGE.SHOW_GRID, true));

    const toggleGrid = (ev: any) => {
        setGrid(ev.target.checked);
        LS.set(LS.STORAGE.SHOW_GRID, ev.target.checked);
        GRID.setVisible(ev.target.checked);
    };

    return <div>
        <FormControlLabel value={useGrid} control={
            <Switch
                checked={useGrid}
                onChange={toggleGrid}
                name="showGrid"
                inputProps={{ 'aria-label': 'show grid' }}
            />
        } label={'Grid'} style={{color: useGrid ? 'black' : 'gray'}}/>
    </div>
}


const NameSwitch = (props: {entities: EntityLayer}) => {
    const [useName, setNames] = React.useState(props.entities.showNames);

    const toggleGrid = (ev: any) => {
        setNames(ev.target.checked);
        LS.set(LS.STORAGE.SHOW_NAMES, ev.target.checked);
        props.entities.setDisplayNamePlates(ev.target.checked);
    };

    return <div>
        <FormControlLabel value={useName} control={
            <Switch
                checked={useName}
                onChange={toggleGrid}
                name="showName"
                inputProps={{ 'aria-label': 'show names' }}
            />
        } label={'Name plates'} style={{color: useName ? 'black' : 'gray'}}/>
    </div>
}


const MeasureSwitch = () => {
    const [useMeasure, setNames] = React.useState(LS.get(LS.STORAGE.SHOW_MEASURES, true));

    const toggleGrid = (ev: any) => {
        setNames(ev.target.checked);
        LS.set(LS.STORAGE.SHOW_MEASURES, ev.target.checked);
        MeasureHandler.showMeasures(ev.target.checked);
    };

    return <div>
        <FormControlLabel value={useMeasure} control={
            <Switch
                checked={useMeasure}
                onChange={toggleGrid}
                name="showName"
                inputProps={{ 'aria-label': 'show measures' }}
            />
        } label={'User Measurements'} style={{color: useMeasure ? 'black' : 'gray'}}/>
    </div>
}


const ZoomSlider = () => {
    const [scale, setScale] = React.useState(1);

    function updateScale(val: number) {
        RENDER.setZoom(val);
        setScale(val);
    }

    return <div>
        <Typography id="discrete-slider" gutterBottom style={{textAlign: "center"}}>
            Zoom Scale: {scale}x
        </Typography>
        <Slider
            value={scale}
            getAriaValueText={() => `${scale}`}
            aria-labelledby="discrete-slider"
            valueLabelDisplay="auto"
            step={.5}
            marks
            min={0.5}
            max={4}
            onChange={ (event: any, newValue: any)=> updateScale(newValue)}
        />
    </div>
}


const NameChange = () => {
    const [showPrompt, setShowPrompt] = React.useState(false);

    function onChange(name: string) {
        metadata.store(Meta.USERNAME, name).then(() => {
            window.location.reload();
        });
    }

    return <div>
        <Button
            onClick={() => {
                setShowPrompt(true);
            }}
            color="primary"
            variant={"outlined"}
            style={{marginTop: '10px', marginBottom: '10px', width: '100%'}}
        >
            Change Username
        </Button>
        <InputDialog
            body={'Enter a new Name'}
            onCancel={()=>setShowPrompt(false)}
            onSubmit={(data: string) => onChange(data)}
            open={showPrompt}
            title={'Change Username'}
            tooltip={'(requires reload)'}
            acceptText={'Change'}
        />
    </div>
}
