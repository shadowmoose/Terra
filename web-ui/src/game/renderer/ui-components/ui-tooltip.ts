import * as PIXI from "pixi.js";
import {GRID_TILE_PX, OVERLAY_DEPTHS, OVERLAY_LAYER} from "../ui-data/globals";

export const DEFAULT_PEN_COLOR = 0xFFFF00;
let cx = 0, cy = 0, w = 0, c = DEFAULT_PEN_COLOR;
let tx = 0, ty = 0;

OVERLAY_LAYER.sortableChildren = true;

export const tooltip = new PIXI.Graphics();
tooltip.zIndex = OVERLAY_DEPTHS.TOOLTIP;
setSize(1);
OVERLAY_LAYER.addChild(tooltip);

export function setTilePos(x: number, y: number) {
    tx = x;
    ty = y;
    cx = x * GRID_TILE_PX - (w-GRID_TILE_PX)/2;
    cy = y * GRID_TILE_PX - (w-GRID_TILE_PX)/2;
    tooltip.position.set(cx, cy);
}

/** Center the tooltip without resizing. */
export function recenter() {
    setTilePos(tx, ty);
}

/** Sets the length of each side of the tooltip. */
export function setSize(tiles: number) {
    w = (Math.max(1, tiles)-1)*2*GRID_TILE_PX+GRID_TILE_PX;
    draw();
    recenter();
}

export function setColor(color: number) {
    c = color;
    draw();
}

function draw() {
    tooltip.clear();
    tooltip.lineStyle(4, c);
    tooltip.drawRect(0, 0, w, w);
}
