import React, {useEffect, useState} from 'react';
import {Button, FormControlLabel, Modal, Switch, TextField, Tooltip} from "@material-ui/core";
import FormGroup from '@material-ui/core/FormGroup';
import {searchImages, Sprite} from "../game/util/sprite-loading";
import {imageHeightPx, imageWidthPx} from '../game/consts';
import '../styles/sprite-picker.scss'
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeGrid} from "react-window";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder';
import FavoriteIcon from '@material-ui/icons/Favorite';
import {Autocomplete} from "@material-ui/lab";
import {Meta, metadata} from "../game/db/metadata-db";
import {SpriteInterface} from "../game/data/interfaces/sprite";


export default function SpritePicker (
    props: {
        onSelect: Function,
        onSearch?: Function,
        defaultTerm?: string,
        selected?: Sprite|null,
        animated?: boolean,
        canAnimate?: boolean,
        forEntity: boolean
    }) {
    const [searchTerm, setSearch] = React.useState(props.defaultTerm || '');
    const [animated, setAnimated] = React.useState(!!props.animated);
    const [sprites, setSprites] = React.useState<Sprite[]>([]);

    const handleChange = (value: string) => {
        setSearch(value);
        if (props.onSearch) {
            props.onSearch(value);
        }
    };
    const animChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAnimated(event.target.checked);
    };

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            getFavorites(props.forEntity).then(fe => {
                const results = searchImages(searchTerm, animated, false, fe);
                setSprites(results);
            })
        }, 200)
        return () => {
            clearTimeout(timeout);
        }
    }, [searchTerm, animated, props.forEntity]);


    return <div style={{
        maxWidth: '600px'
    }}>
        <form noValidate autoComplete="off" onSubmit={e => e.preventDefault()}>
            <FormGroup row>
                <Autocomplete
                    selectOnFocus={true}
                    options={[]}
                    style={{ width: 300 }}
                    freeSolo={true}
                    value={searchTerm}
                    inputValue={searchTerm}
                    onInputChange={(event, newInputValue) => {
                        handleChange(newInputValue);
                    }}
                    renderInput={(params) => <TextField {...params} label="Search Sprites!" variant="outlined" />}
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={animated}
                            onChange={animChange}
                            disabled={!props.canAnimate}
                            name="checkedA"
                            inputProps={{ 'aria-label': 'secondary checkbox' }}
                        />
                    }
                    label="Animated"
                    labelPlacement="top"
                />
            </FormGroup>
        </form>
        <div
            style={{height: '280px'}}
        >
            <SpriteGrid sprites={sprites} onSelect={props.onSelect} selected={props.selected} forEntity={props.forEntity} />
        </div>
    </div>;
}


export function SpriteGrid(props: {sprites: Sprite[], onSelect: Function, selected?: Sprite|null, forEntity: boolean}) {
    return <AutoSizer className={'autosizer'}>
        {function size(size: { height: number, width: number }){
            const wrapperSize = 52;
            const perRow = Math.floor(size.width/wrapperSize);
            const rowCount = Math.ceil(props.sprites.length/ perRow);

            return <FixedSizeGrid
                columnCount={perRow}
                columnWidth={wrapperSize}
                height={size.height}
                width={size.width}
                rowCount={rowCount}
                rowHeight={wrapperSize}
                className={'spriteGrid'}
                style={{maxHeight: `${size.height}px`}}
            >
                {(data: { columnIndex: number, rowIndex: number, style: any }) => {
                    const spr = props.sprites[data.columnIndex + data.rowIndex * perRow];
                    if (spr) {
                        return <div style={data.style}>
                            <SpriteImage sprite={spr} onSelect={props.onSelect} selected={props.selected?.composite === spr.composite} forEntity={props.forEntity}/>
                        </div>
                    } else {
                        return <div/>
                    }
                }}
            </FixedSizeGrid>
        }}
    </AutoSizer>
}


export function SpriteImage(props: {sprite: Sprite|null, onSelect?: Function, selected?: boolean, forEntity: boolean}) {
    const canv: any = React.useRef(null);
    // @ts-ignore
    const sel = props.onSelect ? () => props.onSelect(props.sprite) : ()=>{};
    const isGif = props.sprite?.id.startsWith("gif:");

    React.useEffect(() => {
        const redraw = () => {
            if (isGif) return;
            if (canv.current){
                // @ts-ignore
                const ctx: CanvasRenderingContext2D = canv.current.getContext('2d');
                ctx.clearRect(0,0,canv.current.width, canv.current.height);
                props.sprite?.drawTo(ctx, 0, 0);
            }
        };
        const cancel: any = !isGif && props.sprite?.animated ? setInterval(redraw, 200) : null;
        redraw();

        return () => {
            if (cancel !== null) {
                clearInterval(cancel);
            }
        }
    }, [props.sprite, isGif])

    if (isGif) {
        return <div style={{position: 'relative'}}>
            <FavoriteSpriteButton sprite={props.sprite} forEntity={props.forEntity} />
            <img
                src={props.sprite?.id.replace("gif:", "")}
                width={imageWidthPx}
                height={imageHeightPx}
                style={{width: '48px', height: '48px', background: 'gray'}}
                className={`spriteImage ${props.selected ? 'selected': ''}`}
                title={props.sprite?.name || 'No Sprite'}
                alt={props.sprite?.name || 'No Sprite'}
                onClick={sel}
            />
        </div>
    }

    return <div style={{position: 'relative'}}>
        <FavoriteSpriteButton sprite={props.sprite} forEntity={props.forEntity} />
        <canvas
            ref={canv}
            width={imageWidthPx}
            height={imageHeightPx}
            style={{width: '48px', height: '48px', background: 'gray'}}
            className={`spriteImage ${props.selected ? 'selected': ''}`}
            title={props.sprite?.name || 'No Sprite'}
            onClick={sel}
        />
    </div>
}

export function FavoriteSpriteButton(props: {sprite: Sprite|null, forEntity: boolean}) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isHovered,setIsHovered] = useState(false);
    const offset = 2;

    function toggleFavorite() {
        if (props.sprite) {
            setFavorite(props.sprite, !isFavorite, props.forEntity).then(() => {
                setIsFavorite(!isFavorite);
            });
        }
    }

    useEffect(()=>{
        if (props.sprite) {
            getIsFavorite(props.sprite, props.forEntity).then(fav => {
                setIsFavorite(fav);
            })
        }
    }, [props.sprite, props.forEntity]);

    if (!props.sprite) return null;

    return <>
        <FavoriteIcon
            style={{
                position: 'absolute',
                top: offset,
                left: offset,
                color: isFavorite ? "red" : "gray",
            }}
            fontSize={"small"}
        />
        <Tooltip title={"Toggle favorite"}>
            <FavoriteBorderIcon
                style={{
                    position: 'absolute',
                    top: offset,
                    left: offset,
                    color: isHovered ? "cyan" : "white",
                    cursor: 'pointer'
                }}
                fontSize={"small"}
                onMouseEnter={()=>setIsHovered(true)}
                onMouseLeave={()=>setIsHovered(false)}
                onClick={toggleFavorite}
            />
        </Tooltip>
    </>
}


type cacheTypeKey = 'entities' | 'terrain';
let cachedFavorites: Record<cacheTypeKey, SpriteInterface[]> = {} as any;

async function getFavorites(isForEntity: boolean) {
    const tag = isForEntity ? 'entities' : 'terrain';
    if (!cachedFavorites[tag] || !cachedFavorites[tag].length) {
        const res: typeof cachedFavorites = await metadata.get(Meta.FAVORITE_SPRITES);
        cachedFavorites = res || {};
        cachedFavorites[tag] = cachedFavorites[tag] || [];
    }
    return cachedFavorites[tag];
}

async function getIsFavorite(sprite: Sprite, isForEntity: boolean) {
    const list = await getFavorites(isForEntity);
    return !! list.find(o=>o.id === sprite.id && o.idx === sprite.idx);
}

async function setFavorite(sprite: Sprite, favorite: boolean, isForEntity: boolean) {
    const list = await getFavorites(isForEntity);

    if (favorite) {
         if (!list.find(s=>s.id === sprite.id && s.idx === sprite.idx)) {
             list.push(sprite);
         }
    } else {
        const idx = list.findIndex(v=>v.id === sprite.id && v.idx === sprite.idx);
        if (idx>=0) {
            list.splice(idx, 1);
        }
    }

    await metadata.store(Meta.FAVORITE_SPRITES, cachedFavorites);

    return true;
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        paper: {
            backgroundColor: theme.palette.background.paper,
            border: '2px solid #000',
            boxShadow: theme.shadows[5],
            padding: theme.spacing(2, 4, 3),
            pointerEvents: 'auto',
            maxWidth: '600px',
            minWidth: '400px',
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%)`,
        }
    }),
);

export function SpritePickerModal(props: {open: boolean, onClose: Function, onSelect: Function, currentSprite: Sprite|null}) {
    const classes = useStyles();
    const [gifUrl, setGifUrl] = useState("");

    return <Modal
        open={props.open}
        aria-labelledby="sprite-picker-modal"
        aria-describedby="pick a sprite to use"
        onClose={()=>props.onClose()}
    >
        <div className={classes.paper}>
            <SpritePicker
                defaultTerm={props.currentSprite?.name || ''}
                selected={props?.currentSprite || null}
                animated={props?.currentSprite?.animated || true}
                onSelect={(sp: Sprite) => {
                    props.onClose();
                    props.onSelect(sp);
                }}
                canAnimate={true}
                forEntity={true}
            />

            <FormGroup style={{marginTop: 20}} row>
                <Tooltip
                    title="Try to use a reliable image host, like Imgur. This MUST be a direct link on an https site. Ideally, 48x48 resolution."
                >
                    <Autocomplete
                        selectOnFocus={true}
                        options={[]}
                        style={{ width: 300 }}
                        freeSolo={true}
                        value={gifUrl}
                        inputValue={gifUrl}
                        onInputChange={(event, newInputValue) => {
                            setGifUrl(newInputValue.trim());
                        }}
                        renderInput={(params) => <TextField {...params} label="Use a GIF URL" variant="outlined" />}
                    />
                </Tooltip>

                <Button
                    variant={"outlined"}
                    onClick={()=>{
                        props.onClose();
                        props.onSelect(new Sprite("gif:"+gifUrl, -1));
                        console.log("Selected new Gif:", gifUrl);
                    }}
                    disabled={!gifUrl.trim().startsWith("https:")}
                >
                    Use GIF
                </Button>
            </FormGroup>
        </div>
    </Modal>
}
