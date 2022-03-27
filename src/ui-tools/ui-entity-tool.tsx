import UITool from "./ui-tool";
import FaceIcon from '@material-ui/icons/Face';
import React from "react";
import {observer} from "mobx-react-lite";
import {SpriteImage, SpritePickerModal} from "../ui-components/spritepicker";
import EntityLayer, {Entity} from "../game/controllers/entities";
import {
    Button,
    Checkbox,
    Dialog, DialogActions,
    DialogContent, DialogContentText,
    DialogTitle,
    FormControlLabel, Input, InputLabel, ListItemText, MenuItem, Select,
    TextField,
    Typography
} from "@material-ui/core";
import {createStyles, makeStyles} from "@material-ui/core/styles";
import {Sprite} from "../game/util/sprite-loading";
import FormGroup from "@material-ui/core/FormGroup";
import GameController from "../game/controllers/game";
import EntityUpdateHandler from "../game/net/handlers/entity-update-handler";
import {clients} from '../game/net/peerconnection';
import Campaign from "../game/controllers/campaign";
import {EntityInterface} from "../game/data/interfaces/entity";
import CampaignLoader from "../game/data/campaign-loader";
import stripProxy from "../game/util/deproxy";
import EntityMiddleware from "../game/middleware/entity-events";
import {getCenterViewportTile} from "../game/renderer";


export default class UIEntityTool extends UITool {
    readonly icon: JSX.Element = <FaceIcon />;
    readonly name: string = 'Entity';
    private readonly middleware: EntityMiddleware;

    constructor(controller: GameController) {
        super(controller);
        this.middleware = new EntityMiddleware(controller.entities);
    }

    getControlUI(forMobile: boolean): JSX.Element {
        return <EntityEditorInterface
            entities={this.controller.entities}
            controller={this.controller}
        />
    }

    register(): any {
        console.log('Mounted entity tool.');
        this.middleware.attach();
    }

    unregister(): any {
        console.log('Unmounted entity tool.');
        this.middleware.eject();
    }

    isOption(forMobile: boolean, isHost: boolean): boolean {
        return isHost;
    }
}


const useStyles = makeStyles(() =>
    createStyles({
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
    })
);

const EntityEditorInterface = observer((props: {entities: EntityLayer, controller: GameController}) => {
    const [promptSprite, setSpritePrompt] = React.useState(false);
    const [selectedSprite, setSprite] = React.useState<Sprite|null>(null);
    const [entName, setName] = React.useState('');
    const [visible, setVisible] = React.useState(true);
    const [loadExisting, setLoadExisting] = React.useState(false);

    const resetValues = () => {
        setSpritePrompt(false);
        setSprite(null);
        setName('');
        setVisible(true);
    }

    if (props.entities.selected) return <EntityEditInterface entities={props.entities} campaign={props.controller.campaign}/>

    return <div className={'cont'}>
        <h2>Create Entity</h2>
        <FormGroup row>
            <TextField
                id="ent-name"
                label="Name"
                variant="filled"
                value={entName}
                onChange={(evt) => setName(evt.target.value)}
            />
            <div style={{marginLeft: '12px'}} >
                <SpriteImage
                    sprite={selectedSprite}
                    onSelect={() => {setSpritePrompt(true)}}
                    forEntity={true}
                />
            </div>
        </FormGroup>

        <FormGroup row>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={visible}
                        onChange={(evt)=> setVisible(evt.target.checked)}
                        name="visible"
                    />
                }
                label="Visible"
            />
        </FormGroup>

        <FormGroup row style={{justifyContent: 'space-between'}}>
            <Button
                variant="contained"
                color="primary"
                onClick={()=>{createEntity(props.entities, selectedSprite, entName, visible); resetValues();}}
                disabled={!selectedSprite}
            >
                Create
            </Button>
            <Button variant="contained" color="default" onClick={()=>setLoadExisting(true)} disabled={!props.controller.campaign?.characters.length}>
                Load Character
            </Button>
            <Button variant="contained" color="secondary" onClick={resetValues} >
                Clear
            </Button>
        </FormGroup>

        <SpritePickerModal
            open={promptSprite}
            onClose={()=>setSpritePrompt(false)}
            onSelect={setSprite}
            currentSprite={selectedSprite||null}
        />

        <CampaignCharacterSelector
            entities={props.entities}
            controller={props.controller}
            campaign={props.controller.campaign}
            open={loadExisting}
            onClose={()=>setLoadExisting(false)}
        />
    </div>
});


const EntityEditInterface = observer((props: {entities: EntityLayer, campaign: Campaign|null}) => {
    const ent = props.entities.selected;
    if (!ent) return null;

    const [prompt, setSpritePrompt] = React.useState(false);
    const [promptClone, setClonePrompt] = React.useState(false);
    const update = React.useMemo(() => {
        let timeout: any = null;
        return (info: Partial<Entity>) => {
            if (timeout !== null) {
                clearTimeout(timeout);
            }
            const ent = props.entities.selected;
            if (ent) {
                timeout = setTimeout(() => {
                    props.entities.updateEntity(ent.id, info);
                    if (props.campaign) {
                        updateCampaign(props.campaign, ent);
                    }
                }, 200);
            }
        }
    }, [props.entities, props.campaign])
    const classes = useStyles();
    const updateInstant = (info: Partial<Entity>) => {
        props.entities.updateEntity(ent.id, info);
        if (props.campaign) {
            updateCampaign(props.campaign, ent);
        }
    }
    const clientNames: string[] = Array.from(clients).filter(c=>c.userData).map(cl =>{
        // @ts-ignore
        return cl.userData.username
    });
    const userList: string[] = Array.from(new Set([
        ...clientNames,
        ...ent.owners
    ])).sort();


    return <div className={'cont'}>
        <form className={classes.root} noValidate autoComplete="off" onSubmit={e => e.preventDefault()}>
            <h2>Edit {ent.name}</h2>
            <FormGroup row>
                <TextField
                    id="ent-name"
                    label="Name"
                    variant="filled"
                    value={ent.name}
                    onChange={(evt) => updateInstant({name: evt.target.value})}
                />
                <div style={{marginLeft: '12px'}} >
                    <SpriteImage
                        sprite={ent.sprite}
                        onSelect={() => {setSpritePrompt(true)}}
                        forEntity={true}
                    />
                </div>

            </FormGroup>
            <FormGroup>
                <FormControlLabel
                    control={
                        <input
                            type="color"
                            value={ent.color}
                            className={classes.spriteColor}
                            onChange={evt => update({color: evt.target.value})}
                        />
                    }
                    label={<Typography style={{marginTop: '12px'}}>Color</Typography>}
                />
            </FormGroup>
            <FormGroup row>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={ent.visible}
                            onChange={(evt)=> {
                                updateInstant({visible: evt.target.checked});
                                if (!evt.target.checked) {
                                    EntityUpdateHandler.sendDelete(ent);
                                }
                            }}
                            name="visible"
                        />
                    }
                    label="Visible"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={ent.saveToCampaign}
                            onChange={(evt)=> updateInstant({saveToCampaign: evt.target.checked})}
                            name="saveToCampaign"
                            color="primary"
                        />
                    }
                    label="Campaign-wide"
                />
            </FormGroup>

            <FormGroup>
                <InputLabel>Owners</InputLabel>
                <Select
                    multiple
                    value={ent.owners}
                    onChange={(evt)=>updateInstant({owners: evt.target.value as string[]})}
                    input={<Input />}
                    renderValue={(selected: any) => selected.join(', ')}
                    style={{marginBottom: '25px'}}
                >
                    {userList.map((id: string) => (
                        <MenuItem key={id} value={id}>
                            <Checkbox checked={ent.owners.indexOf(id) > -1} />
                            <ListItemText primary={id} />
                        </MenuItem>
                    ))}
                </Select>
            </FormGroup>

            <FormGroup row style={{justifyContent: 'space-between'}}>
                <Button variant="contained" color="default" onClick={()=>setClonePrompt(true)}>
                    Duplicate
                </Button>
                <Button variant="contained" color="secondary" onClick={()=>props.entities.remove(ent.id)} >
                    Delete
                </Button>
                <Button variant="contained" color="primary" onClick={()=>props.entities.select(null)} >
                    Close
                </Button>
            </FormGroup>
        </form>

        <SpritePickerModal
            open={prompt}
            onClose={()=>setSpritePrompt(false)}
            onSelect={(sp: Sprite) => {props.entities.setEntitySprite(ent, sp)}}
            currentSprite={ent.sprite}
        />

        <PromptForNumber
            onCancel={()=>{ setClonePrompt(false)}}
            onSubmit={(num: number) => {
                setClonePrompt(false);
                if (num) {
                    cloneEntity(props.entities, ent, num);
                }
            }}
            open = {promptClone}
            prompt='How many extra clones would you like?'
            title='Clone Amount'
            label='Clones'
        />
    </div>
});


const CampaignCharacterSelector = observer((props: {
    open: boolean,
    entities: EntityLayer,
    controller: GameController,
    campaign: Campaign|null,
    onClose: Function
}) => {
    if (!props.campaign) return null;
    const characters = props.campaign.characters;
    const [selected, setSelected] = React.useState(characters.length > 0 ? characters[0]?.id : '');

    const onSelect = (id: any) => {
        console.log('Selected character ID:', id);
        setSelected(id);
    };

    const getSelected = (id: any) => {
        return props.campaign?.characters.find(c => c.id === id);
    }

    return <Dialog open={props.open} onClose={()=>props.onClose()}>
            <DialogTitle>Select a Campaign Character</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Select a character saved to this campaign:
                </DialogContentText>
                <Select
                    onChange={(evt)=>onSelect(evt.target.value)}
                    input={<Input />}
                    renderValue={(selected: any) => {
                        const sel = getSelected(selected);
                        if (!sel) return '';

                        return <MenuItem style={{pointerEvents: 'none'}}>
                            <SpriteImage sprite={new Sprite(sel.sprite.id, sel.sprite.idx)} forEntity={true} />
                            {sel.name}
                        </MenuItem>
                    }}
                    style={{marginBottom: '25px',  width: '100%'}}
                    value={selected}
                >
                    {props.campaign.characters.map((cha: EntityInterface) => (
                        <MenuItem key={cha.id} value={cha.id}>
                            <SpriteImage sprite={new Sprite(cha.sprite.id, cha.sprite.idx)} forEntity={true} />
                            <ListItemText primary={cha.name} />
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    props.onClose()
                }} color="primary">
                    Cancel
                </Button>
                <Button onClick={() => {
                    const sel = getSelected(selected);
                    if (sel) {
                        const sp = new Sprite(sel.sprite.id, sel.sprite.idx);
                        createEntity(props.entities, sp, sel.name, true, sel);
                        props.onClose();
                    }
                }} color="primary">
                    Load
                </Button>
            </DialogActions>
        </Dialog>
});


function PromptForNumber(props: {title: string, prompt: string, label?: string, open: boolean, onCancel: Function, onSubmit: Function}) {
    const [num, setNum] = React.useState(0);
    const handleClose = () => {
        props.onSubmit(num);
    };

    return <Dialog open={props.open} onClose={()=>{props.onCancel()}} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent>
            <DialogContentText>
                {props.prompt}
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                label={props.label || ''}
                type="number"
                fullWidth
                onChange={(event) => setNum(parseInt(event.target.value))}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={()=>{props.onCancel()}} color="primary">
                Cancel
            </Button>
            <Button onClick={handleClose} color="primary">
                Submit
            </Button>
        </DialogActions>
    </Dialog>
}


function cloneEntity(entities: EntityLayer, ent: Entity, num: number) {
    if (num) {
        for (let i=0; i<num; i++) {
            entities.addEntity(ent.sprite, {
                x: ent.x,
                y: ent.y,
                color: ent.color,
                owners: [...ent.owners],
                visible: ent.visible,
                name: `${ent.name} ${i+2}`
            });
        }
        entities.updateEntity(ent.id, {
            name: `${ent.name} 1`
        })
    }
}


function createEntity(entities: EntityLayer, sprite: Sprite|null, name: string, visible: boolean, ext?: EntityInterface) {
    if (!sprite) return;

    const coords = getCenterViewportTile();
    entities.addEntity(sprite, {
        ...(ext||{}),
        sprite,
        name,
        visible,
        x: coords.tx,
        y: coords.ty
    })
}

let campUpdateTimer: any = null;

/**
 * Updates, adds, or removes the current Entity from the given Campaign's saved characters.
 * Maintains its own timer, to avoid spam-updating the DB.
 * @param campaign
 * @param ent
 */
function updateCampaign(campaign: Campaign, ent: Entity) {
    clearTimeout(campUpdateTimer);
    campUpdateTimer = setTimeout(() => {
        const savedIdx = campaign.characters.findIndex(c => c.id === ent.id);

        if (ent.saveToCampaign) {
            const newData: EntityInterface = {
                color: ent.color,
                id: ent.id,
                name: ent.name,
                owners: Array.from(ent.owners),
                saveToCampaign: true,
                sprite: {
                    id: ent.sprite.id,
                    idx: ent.sprite.idx
                }
            }
            campaign.characters.splice(savedIdx >= 0 ? savedIdx : campaign.characters.length, 1, stripProxy(newData));
            CampaignLoader.saveCampaign(campaign).then(() => console.debug('Updated campaign.'));
        } else if (savedIdx >= 0) {
            campaign.characters.splice(savedIdx, 1);
            CampaignLoader.saveCampaign(campaign).then(() => console.debug('Removed entity from campaign.'));
        }
    }, 500);
}
