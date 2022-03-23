import { Texture, Sprite } from "pixi.js";
import {GRID_TILE_PX, setForceCull, TERRAIN_LAYER, TextureKey} from "../ui-data/globals";
import {makeTexture, releaseTexture} from "../ui-data/image-loader";

TERRAIN_LAYER.sortableChildren = true;

const tiles: Record<string, Set<Promise<UiTile>>> = {};
const sortTimers: Record<any, any> = {};

function key(tx: number, ty: number) {
    return `${tx},${ty}`;
}

export function getAt(tx: number, ty: number) {
    return tiles[key(tx, ty)] || new Set();
}

/**
 * Set the Z-Index for each tile at the given coords.
 * @param tx
 * @param ty
 */
async function sortAt(tx: number, ty: number) {
    const arr = await Promise.all(Array.from(getAt(tx, ty)));
    arr.sort((t1, t2) => t1.tz - t2.tz).forEach((t, idx) => {
        t.zIndex = idx;
    });
}

function scheduleSort(tx: number, ty: number) {
    const k = key(tx, ty);
    if (sortTimers[k]) clearTimeout(sortTimers[k]);
    sortTimers[k] = setTimeout(() => {
        sortAt(tx, ty).catch(console.error);
    }, 50);
}

/** Internal renderer's representation of a static Tile. */
class UiTile extends Sprite{
    public readonly tx: number;
    public readonly ty: number;
    public readonly tz: number;
    public readonly txtID: string;

    constructor(tx: number, ty: number, z: number, texture: Texture, texID: string) {
        super(texture);
        this.tx = tx;
        this.ty = ty;
        this.position.set(tx * GRID_TILE_PX, ty * GRID_TILE_PX);
        this.tz = z;
        this.txtID = texID;
    }

    /**
     * Clean up the resources used by this tile.
     */
    erase() {
        TERRAIN_LAYER.removeChild(this);
        this.destroy({
            children: true
        });
        releaseTexture(this.txtID).catch(console.error);
    }
}

/**
 * Generate a new Tile, and place it at the given tile coords.
 * @param tx
 * @param ty
 * @param height The real z-index is set automatically relative to other tile heights at the same coords.
 * @param texKey
 */
export function addTerrain(tx: number, ty: number, height: number, texKey: TextureKey) {
    const set = tiles[key(tx, ty)] = getAt(tx, ty);
    const prom = makeTexture(texKey).then( async txt => {
        const tile = new UiTile(tx, ty, height, txt, texKey.uid);

        TERRAIN_LAYER.addChild(tile);
        scheduleSort(tx, ty);

        setForceCull(true);

        return tile;
    });

    set.add(prom);
}

/**
 * Clear all placed or pending tiles at the given coordinates.
 * Any tiles added after/during this call go into a new set, and are not erased.
 * @param tx
 * @param ty
 */
export async function removeTerrainAt(tx: number, ty: number) {
    const set = getAt(tx, ty);
    delete tiles[key(tx, ty)];
    set.forEach(t => t.then(tile => {
        tile.erase()
    }));
}


// @ts-ignore
window.debugTerrainList = tiles;
