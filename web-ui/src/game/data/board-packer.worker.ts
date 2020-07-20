import {ProtoBoard, ProtoTile, ProtoTileStack} from "./protobufs/proto-tiles";
import {Sprite} from "../util/sprite-loading";
import {Tile} from "./interfaces/tile";
import {ProtoSprite} from "./protobufs/proto-sprite";
import {ProtoEntity} from "./protobufs/proto-entity";
import {Entity} from "../controllers/entities";


/**
 * Builds a ProtoTileStack object with all the given Tiles, and their sprites deduplicated.
 * @param tileStack
 */
export async function packTiles (tileStack: Tile[]): Promise<ProtoTileStack> {
    const spriteID = (sprite: Sprite) => `${sprite.id}:${sprite.idx}`;
    const spriteCache: Map<string, any> = new Map();
    const outStack = new ProtoTileStack();

    let spIDX = 0;

    for (const t of tileStack) {
        if (!spriteCache.get(spriteID(t.sprite))) {
            spriteCache.set(spriteID(t.sprite), {
                id: t.sprite.id,
                idx: t.sprite.idx,
                cacheIDx: spIDX++
            });
        }
        const idx = spriteCache.get(spriteID(t.sprite)).cacheIDx;

        outStack.tiles.push(new ProtoTile().assign({x: t.x, y: t.y, z: t.z, spriteIdx: idx}))
    }

    Array.from(spriteCache.values()).forEach(v => {
        outStack.sprites.push(new ProtoSprite().assign({
            id: v.id,
            idx: v.idx
        }))
    })

    return outStack;
}


export async function packBoard(terrain: Tile[]) {
    const outBoard = new ProtoBoard();

    outBoard.terrain = await packTiles(terrain);

    return outBoard;
}
