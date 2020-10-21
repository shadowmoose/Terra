import {observer} from "mobx-react-lite";
import {CircularProgress, Fab, Tooltip} from "@material-ui/core";
import SaveIcon from '@material-ui/icons/Save';
import React from "react";
import GameController from "../game/controllers/game";
import {netMode, NetworkMode} from "../game/net/peerconnection";
import hotkeys from "hotkeys-js";
import google from '../game/util/google-api';
import notifications from "./notifications";
import ConfirmPrompt from "./prompts";


export const BoardSaveButton = observer( (props: {controller: GameController}) => {
    const shouldSave = props.controller.campaign?.loadedBoard &&
        (props.controller.entities.isDirty || props.controller.terrain.isBoardDirty);
    const [saving, setSaving] = React.useState(false);
    const [dbUpdate, setUpdate] = React.useState<any>(null);

    const saveBoard = React.useMemo(() => {
        if (!shouldSave) return ()=>{};
        return async () => {
            if (netMode.get() !== NetworkMode.HOST) return;
            setSaving(true);
            await props.controller.saveBoard();
            if (google.isSignedIn) {
                await google.uploadLocalDB();
            }
            setSaving(false);
        }
    }, [props.controller, shouldSave]);

    React.useMemo(() => {
        // Check for updated DB files in Google Drive whenever a user connects their account:
        google.onSignInChange(async (loggedIn: boolean) => {
            if (loggedIn) {
                const latest = await google.getLatestUpgrade();
                if (latest) {
                    setUpdate(latest);
                } else {
                    notifications.info('Local save up to date!');
                }
            } else {
                notifications.warning('Not syncing with Google Drive.');
            }
        })
    }, [])

    React.useEffect(() => {
        // Enable hotkey for saving:
        hotkeys('ctrl+s', (event, handler) => {
            event.preventDefault();
            event.stopPropagation();
            saveBoard();
        });

        return () => {
            hotkeys.unbind('ctrl+s');
        }
    }, [props.controller, saveBoard])

    if (netMode.get() !== NetworkMode.HOST) return null;

    let title = shouldSave ? "Save Board (ctrl+s)" : "No changes to save.";

    if (saving) title = 'Save in progress...';

    return <div>
        <Tooltip
            title={title}
            style={{
                pointerEvents: 'auto'
            }}
        >
            <span>
                <Fab
                    color="primary"
                    onClick={saveBoard}
                    disabled={!shouldSave}
                >
                    {saving ? <CircularProgress /> : <SaveIcon />}
                </Fab>
            </span>
        </Tooltip>
        <ConfirmPrompt
            open={!!dbUpdate}
            onCancel={()=>setUpdate(null)}
            onConfirm={()=>{
                console.log('Updating from GDrive...');
                google.downloadDB(dbUpdate).then();
                setUpdate(null);
            }}
            title={'Database Update'}
            prompt={'You have a recently updated save stored in Google Drive. Which version would you prefer to use?'}
            confirmButton={'Google Drive'}
            cancelButton={'Local Save'}
        />
    </div>
});
