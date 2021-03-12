import React from 'react';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import UIPenTool from "../ui-tools/ui-pen-tool";
import GameController from "../game/controllers/game";
import UITool from "../ui-tools/ui-tool";
import {Avatar, Modal} from "@material-ui/core";
import UICameraTool from "../ui-tools/ui-camera-tool";
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import UIEraserTool from "../ui-tools/ui-eraser-tool";
import {observer} from "mobx-react-lite";
import * as connection from "../game/net/peerconnection";
import {NetworkMode} from "../game/net/peerconnection";
import UIEntityTool from "../ui-tools/ui-entity-tool";
import UILobbyTool from "../ui-tools/ui-lobby-tool";
import hotkeys from 'hotkeys-js';
import UIMeasuretool from "../ui-tools/ui-measure-tool";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            height: 380,
            transform: 'translateZ(0px)',
            flexGrow: 1,
        },
        speedDial: {
            position: 'fixed',
            bottom: 10,
            right: 10,
        },
        paper: {
            backgroundColor: theme.palette.background.paper,
            border: '2px solid #000',
            boxShadow: theme.shadows[5],
            padding: theme.spacing(2, 4, 3),
            pointerEvents: 'auto'
        }
    }),
);


const ControlMenu = observer((props: {controller: GameController, forMobile: boolean}) => {
    const isHost = connection.netMode.get() === NetworkMode.HOST;
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [tools, setTools] = React.useState<UITool[]>([]);
    const [selectedTool, setSelected] = React.useState<UITool|null>(null);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleModalClose = () => {
        setModalOpen(false);
    };

    const handleModalOpen = () => {
        setModalOpen(true);
    }

    const handleSelect = (action: UITool) => {
        handleClose();
        if (action === selectedTool) {
            return;
        }
        if (selectedTool) {
            selectedTool.unregister();
        }
        setSelected(action);
        action.register();
        setModalOpen(true);
    }

    React.useEffect(() => {
        // When the back button is used, close the modal.
        window.addEventListener('popstate', handleModalClose);

        hotkeys('1,2,3,4,5,6,7,8,9', (event, handler) => {
            const key = parseInt(handler.key);
            const tool = tools.filter(t=>t.isOption(props.forMobile, isHost))[key-1];
            console.log('Hotkey:', key, tool);
            if (tool && tool !== selectedTool) {
                handleSelect(tool);
            }
        });

        return () => {
            window.removeEventListener('popstate', handleModalClose);
            hotkeys.unbind('1,2,3,4,5,6,7,8,9');
        }
    });

    React.useEffect(() => {
        const newTools = [
            new UICameraTool(props.controller),
            new UIPenTool(props.controller),
            new UIEraserTool(props.controller),
            new UIEntityTool(props.controller),
            new UILobbyTool(props.controller),
            new UIMeasuretool(props.controller)
        ];

        setTools(newTools);
        setSelected(newTools[0]);
        newTools[0].register();
    }, [props.controller]);

    let ui;
    const emb = selectedTool?.getControlUI(true);
    if (emb) {
        if (props.forMobile) {
            ui = <div>
                <Avatar
                    className={'useMouse'}
                    onClick={handleModalOpen}
                    style={{
                        position: 'fixed',
                        bottom: '10px',
                        left: '10px',
                        transform: `translateY(-50%)`,
                        background: '#3eec10',
                        cursor: 'pointer'
                    }}
                >
                    <MoreHorizIcon/>
                </Avatar>
                <Modal open={modalOpen} onClose={handleModalClose}>
                    <div className={classes.paper}>
                        {emb}
                    </div>
                </Modal>
            </div>
        } else {
            ui = <div
                style={{position: "fixed", left: '10px', top: '50%', minWidth: '400px', transform: `translateY(-50%)`}}
                className={classes.paper}
            >
                {selectedTool?.getControlUI(false)}
            </div>
        }
    }

    return <div>
        {ui}
        <SpeedDial
            ariaLabel="Control SpeedDial"
            className={classes.speedDial}
            hidden={false}
            icon={selectedTool?.icon || <SpeedDialIcon />}
            onClose={handleClose}
            onOpen={handleOpen}
            open={!props.forMobile || open}
        >
            {tools.filter(t=>t.isOption(props.forMobile, isHost)).map((action, idx) => (
                <SpeedDialAction
                    key={action.name}
                    icon={action.icon}
                    tooltipTitle={action.name}
                    tooltipOpen
                    onClick={(ev) => {ev.stopPropagation(); handleSelect(action)}}
                    title={action.name + ` (Hotkey: ${idx+1})`}
                />
            ))}
        </SpeedDial>
    </div>
});

export default ControlMenu;
