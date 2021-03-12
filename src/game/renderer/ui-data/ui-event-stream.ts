import Subscribable from "./ui-util";
import {GRID_DIMENSIONS, GRID_TILE_PX, OVERLAY_LAYER, WORLD_SIZE_PX} from "./globals";
import * as PIXI from "pixi.js";

export interface SubscribeStream {
    /** The mouse/pointer has been moved over the board. */
    on(event: 'hover', callback: (coords: GridPoint)=>void): () => void;
    emit(event: 'hover', val: GridPoint): void;

    /** Precise coordinates for a pointer movement. */
    on(event: 'pointer-coords', callback: (coords: PixelPoint)=>void): () => void;
    emit(event: 'pointer-coords', val: PixelPoint): void;

    /** The mouse/pointer has been pressed down on the board. */
    on(event: 'mouse-down', callback: (coords: GridPoint)=>void): () => void;
    emit(event: 'mouse-down', val: GridPoint): void;

    /** The mouse/pointer has been released on the board. */
    on(event: 'mouse-up', callback: ()=>void): () => void;
    emit(event: 'mouse-up', val: GridPoint): void;

    /** The mouse RMD has been pressed down on the board. */
    on(event: 'mouse-right-down', callback: (coords: GridPoint)=>void): () => void;
    emit(event: 'mouse-right-down', val: GridPoint): void;

    /** The mouse RMD has been released on the board. */
    on(event: 'mouse-right-up', callback: ()=>void): () => void;
    emit(event: 'mouse-right-up', val: GridPoint): void;

    /** The mouse/pointer has been clicked on the board. */
    on(event: 'click', callback: (coords: GridPoint)=>void): () => void;
    emit(event: 'click', val: GridPoint): void;

    /** The mouse Middle mouse button has been pressed down on the board. */
    on(event: 'mouse-middle-down', callback: (coords: GridPoint)=>void): () => void;
    emit(event: 'mouse-middle-down', val: GridPoint): void;

    /** The mouse Middle mouse button has been released. */
    on(event: 'mouse-middle-up', callback: ()=>void): () => void;
    emit(event: 'mouse-middle-up', val: GridPoint): void;

    /** Emitted when a texture fails to load. */
    on(event: 'texture-fail', callback: (val: {uid: string, msg: string})=>void): () => void;
    emit(event: 'texture-fail', val: {uid: string, msg: string}): void;
}
export const EVENT_STREAM: SubscribeStream = new Subscribable();


/** A coordinate pair of x/y tiles, from the current map OVERLAY_LAYER. */
export interface GridPoint {
    /** Tile x-coordinate. */
    tx: number;
    /** Tile y-coordinate. */
    ty: number;
}

/** Represents an exact pixel coordinate. */
export interface PixelPoint {
    px: number;
    py: number;
}


// =====  EVENTS  =====

let lx = 0, ly = 0;

/**
 * Convert the given Event coordinates into world-based tile coords, clamping them within the grid size.
 * @param ev
 */
function updateHover(ev: any) {
    const tx = Math.max(0, Math.min(GRID_DIMENSIONS-1, Math.floor(ev.data.getLocalPosition(OVERLAY_LAYER).x / GRID_TILE_PX)));
    const ty = Math.max(0, Math.min(GRID_DIMENSIONS-1, Math.floor(ev.data.getLocalPosition(OVERLAY_LAYER).y / GRID_TILE_PX)));

    EVENT_STREAM.emit('pointer-coords', {px: ev.data.getLocalPosition(OVERLAY_LAYER).x, py: ev.data.getLocalPosition(OVERLAY_LAYER).y});

    if (lx !== tx || ly !== ty) {
        lx = tx;
        ly = ty;
        EVENT_STREAM.emit('hover', {tx, ty});
    }

    return {tx, ty};
}


OVERLAY_LAYER.hitArea = new PIXI.Rectangle(0, 0, WORLD_SIZE_PX, WORLD_SIZE_PX);
OVERLAY_LAYER.interactive = true;
OVERLAY_LAYER.position.set(0,0);


// @ts-ignore
OVERLAY_LAYER.on('pointermove', ev => {
    updateHover(ev);
});

// @ts-ignore
OVERLAY_LAYER.on('click', ev => {
    const coords = updateHover(ev);
    EVENT_STREAM.emit('click', coords);
});

// @ts-ignore
OVERLAY_LAYER.on('tap', ev => {
    const coords = updateHover(ev);
    EVENT_STREAM.emit('click', coords);
});

// @ts-ignore
OVERLAY_LAYER.on('touchstart', ev => {
    const coords = updateHover(ev);

    EVENT_STREAM.emit('mouse-down', coords);
});

// @ts-ignore
OVERLAY_LAYER.on('touchend', ev => {
    const coords = updateHover(ev);

    EVENT_STREAM.emit('mouse-up', coords);
});

// @ts-ignore
OVERLAY_LAYER.on('touchendoutside', ev => {
    const coords = updateHover(ev);

    EVENT_STREAM.emit('mouse-up', coords);
});




// @ts-ignore
window.debugEvents = (evName: any) => {
    return EVENT_STREAM.on(evName, (...ev) => {
        // @ts-ignore
        if (ev[0] === 'pointer-coords' || ev[0] === 'hover') return;  // Screen out spam.
        console.debug(...ev);
    });
}
