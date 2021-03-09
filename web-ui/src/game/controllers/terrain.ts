import {Sprite} from "../util/sprite-loading";
import {observable} from "mobx";
import TerrainAddHandler from "../net/handlers/terrain-add-handler";
import TerrainEraseHandler from "../net/handlers/terrain-erase-handler";
import {ProtoBoard} from "../data/protobufs/proto-tiles";
import {Tile} from "../data/interfaces/tile";
import * as TERRAIN from '../renderer/ui-components/ui-terrain';


export default class Terrain{
    private readonly terrain: Record<string, Tile[]> = {};
    public tileIDX: number = 0; // Simple counter to track terrain in the order they were placed.
    @observable public selectedSprite: Sprite | null = null;
    @observable public isBoardDirty: boolean = false;


    public removeAt(x: number, y: number): boolean {
        const exists = this.terrain[Terrain.mkKey(x, y)]?.length;
        if (exists) {
            delete this.terrain[Terrain.mkKey(x, y)];
        }
        TERRAIN.removeTerrainAt(x, y).catch(console.error);
        return !!exists;
    }

    /**
     * Same as removeAt, but send events to clients.
     * @param x
     * @param y
     */
    public eraseAt(x: number, y: number) {
        if (this.removeAt(x, y)) {
            TerrainEraseHandler.sendTerrainRemove(x, y);
            this.isBoardDirty = true;
        }
    }

    /**
     * Draw the currently-selected sprite onto the given coords.
     * @param x
     * @param y
     */
    public drawAt(x: number, y: number): boolean {
        console.log(this.selectedSprite);
        if (this.selectedSprite) {
            return this.placeAt(x, y, new Tile(this.selectedSprite), true);
        }
        return false;
    }

    /**
     * Place the given Tile at the given coords.
     * This method is smart, and auto-handles tile overlay logic.
     * @param x
     * @param y
     * @param tile
     * @param broadcast
     */
    public placeAt(x: number, y: number, tile: Tile, broadcast: boolean = false): boolean {
        const existing = this.getAt(x, y);
        if (existing.length && existing[existing.length-1].sprite.composite === tile.sprite.composite) {
            // The given sprite is already at the top of the stack; Skip adding because it won't do anything.
            return false;
        }
        if (tile.sprite.isBlocker) {
            this.removeAt(x, y);
        }
        const k = Terrain.mkKey(x, y);
        this.terrain[k] = this.terrain[k]?.filter(t => t.sprite.composite !== tile.sprite.composite) || [];  // Filter duplicates.
        this.terrain[k].push(tile);
        tile.x = x;
        tile.y = y;
        tile.z = this.tileIDX++;
        TERRAIN.addTerrain(tile.x, tile.y, tile.z, tile.sprite.textureData[0]);
        if (broadcast) TerrainAddHandler.sendTerrainAdd(this.terrain[k]);
        if (!this.isBoardDirty) this.isBoardDirty = true;
        return true;
    }

    public getAt(x: number, y: number): Tile[] {
        return this.terrain[Terrain.mkKey(x, y)] || [];
    }

    /**
     * Directly export the underlying terrain map, for serialization.
     */
    getDirectMap() {
        return this.terrain;
    }

    /**
     * Import a serialized tile map, over the current data.
     * @param newTerrain
     */
    setDirectMap(newTerrain: ProtoBoard) {
        if (!newTerrain.terrain) throw Error('Malformed packet.')
        for (const k of Object.keys(this.terrain)) {
            const t = this.terrain[k][0];
            this.removeAt(t.x, t.y);
        }

        for (const k of newTerrain.terrain.tiles.sort((a, b) => a.z - b.z)) {
            const sp = newTerrain.terrain.sprites[k.spriteIdx];
            this.placeAt(k.x, k.y, new Tile(new Sprite(sp.id, sp.idx)), false);
        }
    }

    private static mkKey(x: number, y: number): string {
        return `${x},${y}`;
    }
}
