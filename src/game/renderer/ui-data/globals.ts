import {Container, TextureSource} from "pixi.js";
import * as Cull from "pixi-cull";

/** The size of the world grid, in tiles. */
export const GRID_DIMENSIONS = 100;

/** The dimensions of each tile, in pixels. */
export const GRID_TILE_PX = 48;

/** The total size of the world, in pixels. */
export const WORLD_SIZE_PX = GRID_DIMENSIONS * GRID_TILE_PX;



// PIXI Stuff:
/** The cull implementation, which manages the visibility of layers added into it. */
export const CULLER = new Cull.SpatialHash();
/** The layer which holds Terrain tiles. Culled. */
export const TERRAIN_LAYER = new Container();
/** The layer which holds Entities. Not culled. */
export const ENTITY_LAYER = new Container();
/** The layer for topmost UI Elements. */
export const OVERLAY_LAYER = new Container();

/**
 * Since many things use the overlay layer, their respective z-index depths are tracked here.
 */
export enum OVERLAY_DEPTHS {
    _,
    NAMEPLATE,
    MARKER_BKG,
    MARKER_TXT,
    SHAPES,
    TOOLTIP
}


let forceNextCull = false;

/**
 * Override the default viewport dirty flag to force a re-cull after the next draw cycle.
 * Useful after adding sprites that may be culled.
 */
export function setForceCull(dirty = true) {
    forceNextCull = dirty;
}
export function getForceCull() {
    return forceNextCull;
}

export interface TextureKeySource {
    uid: string;
    source: TextureSource|Promise<TextureSource>;
}
export interface TextureKeyAtlas {
    uid: string;
    atlas: Promise<HTMLCanvasElement>;
    px: number;
    py: number;
    w: number;
    h: number;
}
export type TextureKey = TextureKeySource | TextureKeyAtlas;


// @ts-ignore
window.debugCullStats = ()=>CULLER.stats();
