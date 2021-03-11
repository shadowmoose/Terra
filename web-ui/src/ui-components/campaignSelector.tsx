import React from "react";
import GameController from "../game/controllers/game";
import {Meta, metadata} from "../game/db/metadata-db";
import CampaignLoader from "../game/data/campaign-loader";
import {observer} from "mobx-react-lite";
import Campaign from "../game/controllers/campaign";
import PublicIcon from '@material-ui/icons/Public';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import SaveAltIcon from '@material-ui/icons/SaveAlt';
import RestoreIcon from '@material-ui/icons/Restore';
import BackupIcon from '@material-ui/icons/Backup';
import CloudOffIcon from '@material-ui/icons/CloudOff';
import {Button, Dialog, DialogContent, DialogTitle, Fab, InputLabel, Menu, MenuItem, Tooltip} from "@material-ui/core";
import {netMode, NetworkMode} from "../game/net/peerconnection";
import {InputDialog} from "./prompts";
import {db} from "../game/db/database";
import * as download from 'downloadjs';
import google from '../game/util/google-api';


export const CampaignSelector = observer((props: {controller: GameController}) => {
    const [need, setNeed] = React.useState(true);
    const [wantOpen, setWantOpen] = React.useState(false);
    const [promptNew, setPromptNew] = React.useState(false);
    const [campaignList, setList] = React.useState<Campaign[]>([]);
    const [storage, setStorage] = React.useState({q: 1, u: 0});

    const selectCampaign = React.useMemo(() => {
        return (camp: Campaign) => {
            setNeed(false);
            props.controller.campaign = camp;
            metadata.store(Meta.CAMPAIGN_CURRENT, camp.id).then();
            if (props.controller.campaign.loadedBoard) {
                props.controller.loadBoard(props.controller.campaign.loadedBoard).then();
            }
        }
    }, [props.controller]);

    React.useMemo(() => {
        // Check initially to see if we already have a username stored:
        metadata.get(Meta.CAMPAIGN_CURRENT).then(async (id: number) => {
            if (id === null) return;
            console.debug('Current campaign:', id);
            const camp = await CampaignLoader.loadCampaign(id);
            if (!camp) return;
            selectCampaign(camp);
        });

        // Load all available campaigns:
        CampaignLoader.getAvailable().then(campaigns => setList(campaigns));

        // Lookup used storage:
        navigator.storage?.estimate().then(function(estimate) {
            const u = estimate.usage;
            const q = estimate.quota
            if (u !== undefined && q !== undefined) setStorage({ q, u});
        });
    }, [selectCampaign]);

    const addCampaign = async (name: string) => {
        setPromptNew(false);
        if (name.trim().length) {
            const c = await CampaignLoader.createCampaign(name);
            setList([...campaignList, c]);
        }
    }

    const handleModalClose = () => {
        if (!need) {
            setWantOpen(false);
        }
    }

    if (netMode.get() !== NetworkMode.HOST) return null;

    return <div className={'menu_button'}>
        <Tooltip
            title="Campaign Settings"
            style={{
                pointerEvents: 'auto'
            }}
        >
            <Fab
                color="default"
                onClick={()=>{setWantOpen(true)}}
            >
                <PublicIcon style={{color: '#4d8a20'}}/>
            </Fab>
        </Tooltip>

        <Dialog open={need || wantOpen} onClose={handleModalClose}>
            <DialogTitle style={{textAlign: "center"}}>Campaign Info</DialogTitle>
            <DialogContent style={{textAlign: "center"}}>
                <CampaignMenu campaigns={campaignList} onSelect={selectCampaign} selected={props.controller.campaign}/>
                <Button
                    variant="contained"
                    color="default"
                    onClick={()=>setPromptNew(true)}
                    startIcon={<AddCircleOutlineIcon />}
                >
                    Create New Campaign
                </Button>
                <p style={{color: 'gray'}}>
                    {
                        storage ?
                            `${(storage.u/storage.q * 100).toFixed(2)}% used of ${formatBytes(storage.q)}`
                            : 'Storage metrics unknown'
                    }
                </p>
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={exportLocalDB}
                    startIcon={<SaveAltIcon />}
                >
                   Save Backup
                </Button>
                <input
                    id="backup-input"
                    type="file"
                    style={{display: "none"}}
                    onChange={restoreLocalDB}
                    accept={'application/json'}
                />
                <Button
                    variant="outlined"
                    color="default"
                    onClick={() => document.getElementById('backup-input')?.click()}
                    startIcon={<RestoreIcon />}
                    style={{marginLeft: '2px'}}
                >
                    Restore
                </Button>
                <DialogTitle>Google Drive:</DialogTitle>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => google.promptSignIn()}
                    startIcon={<BackupIcon />}
                    style={{display: google.isSignedIn ? 'none':''}}
                >
                    Sign In
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => google.signOut()}
                    startIcon={<CloudOffIcon />}
                    style={{display: google.isSignedIn ? '':'none'}}
                >
                    Sign Out
                </Button>
            </DialogContent>
        </Dialog>
        <InputDialog
            open={promptNew}
			title='New Campaign'
			body='Enter a name for the new Campaign:'
			acceptText={'Create'}
			tooltip={'Campaign Name'}
			onSubmit={addCampaign}
			onCancel={()=>setPromptNew(false)}
		/>
    </div>
})


export function CampaignMenu(props: {campaigns: Campaign[], onSelect: Function, selected: Campaign|null}) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [selected, setSelected] = React.useState<Campaign|null>(props.selected);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (campaign: Campaign|null) => {
        if (campaign) {
            setSelected(campaign);
            props.onSelect(campaign);
        }
        setAnchorEl(null);
    };

    const camps = props.campaigns.sort((c1, c2)=>c1.timeCreated-c2.timeCreated).map(c => {
        return <MenuItem key={c.id} onClick={()=>handleClose(c)}>
            <b>{c.name}</b>&nbsp;-&nbsp;<i>[{new Date(c.timeCreated).toLocaleString()}]</i>
        </MenuItem>
    });

    return (
        <div style={{marginBottom: '20px'}}>
            <InputLabel htmlFor='campaign-list-btn'>Current Campaign:</InputLabel>
            <Button
                variant='outlined'
                onClick={handleClick}
                id={'campaign-list-btn'}
                disabled={props.campaigns.length===0}
                style={{maxWidth: '300px', minWidth: '200px', overflowX: 'hidden'}}
            >
                {selected? selected.name : (props.campaigns.length ? 'Select a Campaign':'No campaigns exist')}
            </Button>
            <Menu
                id="simple-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={()=>handleClose(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
            >
                {camps}
            </Menu>
        </div>
    );
}


function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Export the full database as a JSON file.
 */
async function exportLocalDB() {
    // @ts-ignore
    const blob = await db.toBlob();

    // @ts-ignore
    download(blob, `terra-backup.json`, 'application/json');
}

async function restoreLocalDB() {
    // @ts-ignore
    const file = document.getElementById('backup-input')?.files[0];
    await db.importData(file);
}
