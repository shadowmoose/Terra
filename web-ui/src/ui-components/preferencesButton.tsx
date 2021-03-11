import {observer} from "mobx-react-lite";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Fab,
    FormControlLabel,
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
            title='Settings'
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
            <DialogTitle style={{textAlign: "center"}}>User Settings</DialogTitle>

            <DialogContent style={{textAlign: "center"}}>
                <Typography variant="h6" component="h6" gutterBottom>Display Options</Typography>
            </DialogContent>

            <DialogContent style={{textAlign: "left"}}>
                <GridSwitch />
                <NameSwitch entities={props.controller.entities} />
                <MeasureSwitch />
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
