import {observer} from "mobx-react-lite";
import React from "react";
import UITool from "./ui-tool";
import GroupIcon from '@material-ui/icons/Group';
import CancelIcon from '@material-ui/icons/Cancel';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import Lobby, {PendingUser} from "../game/controllers/lobby";
import {createStyles, makeStyles} from "@material-ui/core/styles";
import {MenuItem, MenuList, Tooltip} from "@material-ui/core";
import { IconButton } from '@material-ui/core';
import * as network from '../game/net/peerconnection'
import {updateUser, UserData} from "../game/db/user-db";

export default class UILobbyTool extends UITool {
    readonly icon: JSX.Element = <GroupIcon />;
    readonly name: string = 'Lobby';

    getControlUI(forMobile: boolean): JSX.Element | null {
        return <LobbyInterface lobby={this.controller.lobby}/>;
    }

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return isHost;
    }

    register(): any {}

    unregister(): any {}
}

const useStyles = makeStyles(() => createStyles({
        root: {
            flexGrow: 1,
        },
        speedDial: {
            position: 'fixed',
            bottom: 10,
            right: 10,
        },
        spriteColor: {
            marginLeft: '12px',
            marginTop: '10px',
            marginRight: '5px'
        }
    }));


const LobbyInterface = observer((props: {lobby: Lobby}) => {
    const classes = useStyles();

    return <div className={'cont'}>
        <form className={classes.root} noValidate autoComplete="off" onSubmit={e => e.preventDefault()}>
            <h2>Lobby</h2>
            <a href={window.location.href} target='_blank' rel="noopener noreferrer">Invite Link</a>
            <PendingList lobby={props.lobby} />
            <UserList />
        </form>
    </div>
});

const PendingList = observer((props: {lobby: Lobby}) => {
    const eles = props.lobby.pendingLogins.map(pl => {
        return <PendingUserEle key={pl.keyCode} user={pl} lobby={props.lobby}/>
    });

    if(!eles.length) return null;

    return <div>
        <div style={{border: '1px solid black'}}>
            <h4 style={{marginBottom: '5px'}}>Pending:</h4>
            <MenuList>
                {eles}
            </MenuList>
        </div>
    </div>
});

const PendingUserEle = (props: {user: PendingUser, lobby: Lobby}) => {
    const approve = (ev: any) => {
        props.lobby.approveUser(props.user)
        ev.preventDefault();
        ev.stopPropagation();
    }
    const reject = (ev: any) => {
        props.lobby.rejectUser(props.user)
        ev.preventDefault();
        ev.stopPropagation();
    }

    return <MenuItem style={{justifyContent: 'space-between'}} disableTouchRipple={true}>
        <Tooltip title={'Device: ' + props.user.keyCode}><div>{props.user.username}</div></Tooltip>
        <Tooltip title="Approve"><IconButton children={<ThumbUpIcon/>} color="primary" onClick={approve}/></Tooltip>
        <Tooltip title="Kick"><IconButton children={<CancelIcon />} color="secondary" onClick={reject}/></Tooltip>
    </MenuItem>
}


const UserList =  observer((props: {}) => {
    const eles = Array.from(network.clients).filter(c=>c.userData).map(c => {
        // @ts-ignore
        const dat: UserData = c.userData;
        const reject = (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            updateUser({
                ...dat,
                keyCodes: []
            }).then(() => {
                c.close()
            })
        }

        return <MenuItem key={dat.id} style={{justifyContent: 'space-between'}} disableTouchRipple={true}>
            {dat.username}
            <Tooltip title="Kick"><IconButton children={<CancelIcon />} color="secondary" onClick={reject}/></Tooltip>
        </MenuItem>
    });

    if (!eles.length) return <div>
        <h5>No users online</h5>
    </div>;

    return <div>
        <h4 style={{marginBottom: '1px'}}>Online:</h4>
        <MenuList>
            {eles}
        </MenuList>
    </div>
});
