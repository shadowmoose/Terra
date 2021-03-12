import React from "react";
import {observer} from "mobx-react-lite";
import {Button, Fab, MenuItem, MenuList, Popover, Tooltip, Typography} from "@material-ui/core";
import MapIcon from '@material-ui/icons/Map';
import GameController from "../game/controllers/game";
import {netMode, NetworkMode} from "../game/net/peerconnection";
import Campaign from "../game/controllers/campaign";
import FormGroup from "@material-ui/core/FormGroup";
import notifications from './notifications';
import ConfirmPrompt, {InputDialog} from "./prompts";



export const BoardSelector = observer((props: {controller: GameController}) => {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const campaign = props.controller.campaign;
    if (netMode.get() !== NetworkMode.HOST) return null;

    if (!campaign) return null;

    return <div style={{pointerEvents: 'auto',}}>
        <Tooltip
            title="Selected Board"
        >
            <Fab
                variant="extended"
                onClick={(evt: any)=>{setAnchorEl(evt.currentTarget)}}
                style={{width: '200px', overflowX: 'hidden', marginTop: '5px'}}
            >
                <MapIcon style={{marginRight: '5px'}}/>
                <Typography variant="inherit" noWrap>
                    {campaign?.loadedBoard ? campaign.loadedBoard : '[Untitled Board]'}
                </Typography>
            </Fab>
        </Tooltip>
        <Popover
            open={!!anchorEl}
            anchorEl={anchorEl}
            onClose={()=>setAnchorEl(null)}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }}
        >
            <BoardControlMenu campaign={campaign} controller={props.controller}/>
        </Popover>
    </div>
});

export const BoardControlMenu = (props: {controller: GameController, campaign: Campaign}) => {
    const [selected, setSelected] = React.useState(props.campaign.loadedBoard);

    const handleSelected = (board: string) => {
        setSelected(board);
    }

    return <form
        style={{
            flexGrow: 1,
            width: '300px'
        }}
        noValidate
        autoComplete="off"
        onSubmit={e => e.preventDefault()}
    >
        <FormGroup row>
            <BoardSelectMenu campaign={props.campaign} onSelect={handleSelected}/>
        </FormGroup>
        <FormGroup row>
            <BoardLoadButton controller={props.controller} selected={selected} setSelected={setSelected} />
            <BoardDeleteButton controller={props.controller} campaign={props.campaign} selected={selected} setSelected={setSelected} />
            <BoardCreateButton controller={props.controller} campaign={props.campaign} selected={selected} setSelected={setSelected} />
        </FormGroup>
    </form>
}


export const BoardSelectMenu = observer((props: {campaign: Campaign, onSelect: Function}) => {
    const [selected, setSelected] = React.useState(props.campaign.loadedBoard);

    const boards = props.campaign.boards.map(b => {
        return <MenuItem
            key={b}
            onClick={() => {setSelected(b); props.onSelect(b)}}
            selected={b === selected}
        >
            <Typography
                variant="inherit"
                noWrap
                color={b === props.campaign.loadedBoard ? 'textSecondary':'initial'}
            >
                {b}
            </Typography>
        </MenuItem>
    });

    return <MenuList style={{maxHeight: '400px',  overflow: 'auto', width: '100%'}}>
        {boards}
    </MenuList>;
});

export const BoardLoadButton = (props: {controller: GameController, selected: string|null, setSelected: Function}) => {
    return <Button
        color="primary"
        disabled={props.controller.campaign?.loadedBoard === props.selected}
        onClick={() => {
            if (props.selected) {
                props.controller.loadBoard(props.selected).then();
            }
        }}
    >
        Load
    </Button>
};

export const BoardDeleteButton = (props: {
    controller: GameController,
    campaign: Campaign,
    selected: string|null,
    setSelected: Function
}) => {
    const [confirm, needConfirm] = React.useState(false);

    return <div>
        <Button
            disabled={!props.selected}
            color="secondary"
            onClick={() => {needConfirm(true)}}
        >
            Delete
        </Button>
        <ConfirmPrompt
            open={confirm}
            onCancel={() => {needConfirm(false)}}
            onConfirm={() => {
                if (props.selected) {
                    props.controller.deleteBoard(props.campaign, props.selected).catch(err => {
                        notifications.error('Failed to delete board!');
                        console.error(err);
                    });
                    props.setSelected(null);
                    needConfirm(false);
                }
            }}
            title={'Really delete?'}
            prompt={`Are you sure you want to delete the board "${props.selected}"?`}
            confirmButton={'Delete'}
        />
    </div>
};

export const BoardCreateButton = (props: {
    controller: GameController,
    campaign: Campaign,
    selected: string|null,
    setSelected: Function
}) => {
    const [needPrompt, setPrompt] = React.useState(false);
    const handleCreate = (name: string) => {
        setPrompt(false);
        if (props.campaign.boards.includes(name)) {
            return notifications.error('All board names must be unique!')
        }
        if (name && name.trim().length) {
            props.campaign.boards.push(name);
            props.setSelected(name);
            props.controller.loadBoard(name).then();
        }
    }

    return <div>
        <Button
            style={{color: 'rgba(25,160,7,0.94)'}}
            onClick={() => {
                setPrompt(true);
            }}
        >
            New
        </Button>
        <InputDialog
            open={needPrompt}
            title='Create a Board'
            body='Enter the name for the new Board:'
            tooltip={'Board name'}
            acceptText={'Create'}
            onSubmit={handleCreate}
            onCancel={handleCreate}
        />
    </div>
};
