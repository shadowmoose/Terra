import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField
} from "@material-ui/core";

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
                    <Button onClick={() => {
                        handleClose();
                        props.onCancel()
                    }} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={() => {
                        props.onSubmit(text);
                        setText('')
                    }} color="primary">
                        {props.acceptText || 'Connect'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}



export default function ConfirmPrompt(props: {
    open: boolean,
    onCancel: any,
    onConfirm: any,
    title: string,
    prompt: string,
    confirmButton?: string,
    cancelButton?: string
}) {
    return (
        <div>
            <Dialog
                open={props.open}
                onClose={props.onCancel}
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <DialogTitle className="confirm-dialog-title">{props.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText className="prompt-dialog-description">
                        {props.prompt}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={props.onCancel} color="primary">
                        {props.cancelButton||'cancel'}
                    </Button>
                    <Button onClick={props.onConfirm} color="primary" autoFocus>
                        {props.confirmButton||'confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
