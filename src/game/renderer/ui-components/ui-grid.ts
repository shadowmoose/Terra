// Build grid (also functions as the input handler):
import * as PIXI from "pixi.js";
import { Texture } from "pixi.js";
import {GRID_TILE_PX} from "../ui-data/globals";


PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST

export const grid = new PIXI.TilingSprite(makeGridTexture(), 100, 100);
grid.roundPixels = false;
grid.position.set(0,0);
grid.visible = true;
grid.alpha = 0.5;

/**
 * Extremely naive implementation to find optimal repeating texture size.
 */
function findPow() {
    for (let i=1; i < 20; i++) {
        if (Math.pow(i, 2) % GRID_TILE_PX === 0) return Math.pow(i, 2);
    }
    console.warn('Unable to find satisfactory texture size for grid.');
    return GRID_TILE_PX*3;
}

function makeGridTexture() {
    const render = document.createElement('canvas');
    const ctx = render.getContext('2d')!;
    const dim = findPow();// Power of two divisible by 48px (tile width).
    render.width = dim;
    render.height = dim;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,dim,dim);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';

    for (let y=0; y < Math.ceil(dim / GRID_TILE_PX); y++) {
        for (let x=0; x < Math.ceil(dim / GRID_TILE_PX); x++) {
            ctx.fillRect(0,y*GRID_TILE_PX, dim, 2);

            ctx.fillRect(x*GRID_TILE_PX,0, 2, dim);
        }
    }
    return Texture.from(render);
}

/**
 * Toggle grid visibility.
 * @param showGrid
 */
export function setVisible(showGrid: boolean) {
    grid.visible = showGrid;
}

// @ts-ignore
window.debugGridToggle = setVisible;
