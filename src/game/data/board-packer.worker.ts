import {ProtoBoard, ProtoTile, ProtoTileStack} from "./protobufs/proto-tiles";
import {Sprite} from "../util/sprite-loading";
import {Tile} from "./interfaces/tile";
import {ProtoSprite} from "./protobufs/proto-sprite";

/**
 * Builds a ProtoTileStack object with all the given Tiles, and their sprites deduplicated.
 * Does not assume that the given tile "stack" is actually the same x&y coord,
 * as this is not the case when bulk-saving the board.
 * @param tileStack
 */
export async function packTiles (tileStack: Tile[]): Promise<ProtoTileStack> {
    const spriteID = (sprite: Sprite) => `${sprite.id}:${sprite.idx}`;
    const spriteCache: Map<string, any> = new Map();
    const outStack = new ProtoTileStack();
    const relativeZCache: Record<string, number> = {};

    let spIDX = 0;

    for (const t of tileStack.sort((a, b) => a.z - b.z)) {
        if (!spriteCache.get(spriteID(t.sprite))) {
            spriteCache.set(spriteID(t.sprite), {
                id: t.sprite.id,
                idx: t.sprite.idx,
                cacheIDx: spIDX++
            });
        }
        const idx = spriteCache.get(spriteID(t.sprite)).cacheIDx;
        // Shift the z-index to be relative to the stacked tiles. This enables compression to work ~40% better without having a ton of unique tile IDs everywhere:
        const zKey = `${t.x},${t.y}`;
        const relativeZ = relativeZCache[zKey] = (relativeZCache[zKey] || 0)+1;

        outStack.tiles.push(new ProtoTile().assign({x: t.x, y: t.y, z: relativeZ, spriteIdx: idx}))
    }

    Array.from(spriteCache.values()).forEach(v => {
        outStack.sprites.push(new ProtoSprite().assign({
            id: v.id,
            idx: v.idx
        }))
    })

    console.log(outStack);

    return outStack;
}


export async function packBoard(terrain: Tile[]) {
    const outBoard = new ProtoBoard();

    outBoard.terrain = await packTiles(terrain);

    return outBoard;
}
