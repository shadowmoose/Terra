import React, {useState} from 'react';
import {Button, FormControlLabel, Modal, Switch, TextField, Tooltip} from "@material-ui/core";
import FormGroup from '@material-ui/core/FormGroup';
import {searchImages, Sprite} from "../game/util/sprite-loading";
import {imageHeightPx, imageWidthPx} from '../game/consts';
import '../styles/sprite-picker.scss'
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeGrid} from "react-window";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";
import {Autocomplete} from "@material-ui/lab";
import {toggleViewportInput} from "../game/renderer";


export default function SpritePicker (
    props: {
        onSelect: Function,
        onSearch?: Function,
        defaultTerm?: string,
        selected?: Sprite|null,
        animated?: boolean
        canAnimate?: boolean
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
            const results = searchImages(searchTerm, animated, false);
            setSprites(results);
        }, 200)
        return () => {
            clearTimeout(timeout);
        }
    }, [searchTerm, animated]);


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
        <div style={{height: '280px'}}>
            <SpriteGrid sprites={sprites} onSelect={props.onSelect} selected={props.selected} />
        </div>
    </div>;
}


export function SpriteGrid(props: {sprites: Sprite[], onSelect: Function, selected?: Sprite|null}) {
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
                            <SpriteImage sprite={spr} onSelect={props.onSelect} selected={props.selected?.composite === spr.composite}/>
                        </div>
                    } else {
                        return <div/>
                    }
                }}
            </FixedSizeGrid>
        }}
    </AutoSizer>
}


export function SpriteImage(props: {sprite: Sprite|null, onSelect?: Function, selected?: boolean}) {
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
        return <img
            src={props.sprite?.id.replace("gif:", "")}
            width={imageWidthPx}
            height={imageHeightPx}
            style={{width: '48px', height: '48px', background: 'gray'}}
            className={`spriteImage ${props.selected ? 'selected': ''}`}
            title={props.sprite?.name || 'No Sprite'}
            alt={props.sprite?.name || 'No Sprite'}
            onClick={sel}
        />
    }

    return <canvas
        ref={canv}
        width={imageWidthPx}
        height={imageHeightPx}
        style={{width: '48px', height: '48px', background: 'gray'}}
        className={`spriteImage ${props.selected ? 'selected': ''}`}
        title={props.sprite?.name || 'No Sprite'}
        onClick={sel}
    />
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

    React.useEffect(()=>{
        toggleViewportInput(!props.open);
        return ()=>{
            toggleViewportInput(true);
        }
    }, [props.open]);

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
            />

            <FormGroup style={{marginTop: 20}} row>
                <Tooltip
                    title="Try to use a reliable image host, like Imgur. This MUST be a direct link on an https site."
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
