import React from "react";
import GameController from "../game/controllers/game";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField
} from "@material-ui/core";

/**
 * Helper UI to prompt the user for their connection action, if no Room ID hashcode is set.
 * @param props
 * @constructor
 */
export default function LoginHelper (props: {controller: GameController}) {
    const [promptLogin, setPrompt] = React.useState(true);
    const [needClient, setNeedClient] = React.useState(false);

    const setHosting = (hosting: boolean) => {
        setPrompt(false);
        if (hosting) {
            return props.controller.startHost();
        } else {
           setNeedClient(true);
        }
    };

    return <div>
        { promptLogin ? <PromptNetwork select={setHosting}/> : null }
        <InputDialog
            open={needClient}
            title={'Enter host ID'}
            body={'Enter the ID of the host lobby you\'d like to join'}
            tooltip={'Host ID'}
            onCancel={() => {setNeedClient(false); setPrompt(true)}}
            onSubmit={(txt: string) => props.controller.startClient(txt)}
        />
    </div>
}


function PromptNetwork (props: {select: Function}) {

    return <Dialog open={true} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Network Mode</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Would you like to join a campaign, or host your own campaign?
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => {props.select(true)}}>
                Host
            </Button>
            <Button onClick={() => { props.select(false)}}>
                Join
            </Button>
        </DialogActions>
    </Dialog>
}


export function InputDialog(props: {
    open: boolean
    title: string,
    body: string,
    tooltip: string,
    onSubmit: Function,
    onCancel: Function,
    acceptText?: string
}) {
    const [text, setText] = React.useState('');

    const handleClose = () => {
        props.onCancel();
    };
    const handleText = (event: React.ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
    }

    return (
        <div>
            <Dialog open={props.open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {props.body}
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label={props.tooltip}
                        type="text"
                        fullWidth
                        value={text}
                        onChange={handleText}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {handleClose(); props.onCancel()}} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={() => {props.onSubmit(text); setText('')}} color="primary">
                        {props.acceptText || 'Connect'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
