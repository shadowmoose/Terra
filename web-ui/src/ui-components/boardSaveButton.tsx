import {observer} from "mobx-react-lite";
import {Fab, Tooltip} from "@material-ui/core";
import SaveIcon from '@material-ui/icons/Save';
import React from "react";
import GameController from "../game/controllers/game";


export const BoardSaveButton = observer( (props: {controller: GameController}) => {
    const shouldSave = props.controller.campaign?.loadedBoard &&
        (props.controller.entities.isDirty || props.controller.terrain.isBoardDirty);

    return <Tooltip
        title={shouldSave ? "Save Board" : "No changes to save."}
        style={{
            pointerEvents: 'auto'
        }}
    >
        <span>
            <Fab
                color="primary"
                onClick={()=>{props.controller.saveBoard().then()}}
                disabled={!shouldSave}
            >
                <SaveIcon />
            </Fab>
        </span>
    </Tooltip>
});
