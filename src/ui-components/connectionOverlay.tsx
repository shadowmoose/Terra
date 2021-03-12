import * as connection from "../game/net/peerconnection";
import {isHost, NetworkMode, NetworkStatus} from "../game/net/peerconnection";
import LoginHelper from "./loginHelper";
import Backdrop from "@material-ui/core/Backdrop";
import {Typography} from "@material-ui/core";
import React from "react";
import GameController from "../game/controllers/game";

/**
 * Util to display network status to the user.
 * @param props
 * @constructor
 */
export default function ConnectionOverlay(props: {controller: GameController}) {
    let content = null;
    let message = null;

    if (connection.netMode.get() === NetworkMode.UNKNOWN) {
        content = <LoginHelper controller={props.controller} />

    } else {
        switch (connection.netStatus.get()) {
            case NetworkStatus.DISCONNECTED:
                if (!isHost()) message = `Error connecting to service. Cannot reconnect.`; // client only, host can stay on editing.
                break;
            case NetworkStatus.RECONNECTING:
                message = 'Error with connection to Host. Attempting reconnection...';
                break;
            case NetworkStatus.CONNECTING:
                message = 'Connecting to Host...';
                break;
            case NetworkStatus.MATCHMAKING_FAIL:
                message = 'Connection to matchmaking server failed. Please reload.';
                break;
            case NetworkStatus.WAITING_FOR_HOST:
                message = 'Waiting for the Host to approve our login...';
                break;
            default:
                message = null;
        }
    }

    if (message) {
        content =  <Backdrop open={true} transitionDuration={0}>
            <Typography variant="h4" component="h4" gutterBottom>
                {message}
            </Typography>
        </Backdrop>;
    }
    return content;
}
