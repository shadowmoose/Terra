import {Canvas} from "./canvas";
import {Sprite} from "../util/sprite-loading";
import {imageHeightPx, imageWidthPx} from "../consts";
import {observable} from "mobx";
import TerrainAddHandler from "../net/handlers/terrain-add-handler";
import TerrainEraseHandler from "../net/handlers/terrain-erase-handler";
import {ProtoBoard} from "../data/protobufs/proto-tiles";
import {Tile} from "../data/interfaces/tile";


export default class Terrain extends Canvas {
    private readonly terrain: Record<string, Tile[]> = {};
    public boardWidth: number = 0;
    public boardHeight: number = 0;
    public tileIDX: number = 0; // Simple counter to track terrain in the order they were placed.
    @observable public selectedSprite: Sprite | null = null;

    constructor(width: number, height: number) {
        super('terrain');
        this.resizeBoard(width, height);
    }

    public resizeBoard(width: number, height: number) {
        this.boardWidth = width;
        this.boardHeight = height;
        for (const tList of Object.values(this.terrain)) {
            const x = tList[0].x;
            const y = tList[0].y;
            if (x > this.boardWidth || y > this.boardHeight) {
                this.removeAt(x, y);
            }
        }
    }

    /**  Derive new tile widthxheight whenever this canvas is resized. */
    public setSize(width: number, height: number) {
        super.setSize(width, height);
        this.resizeBoard(Math.floor(width/imageWidthPx), Math.floor(height/imageHeightPx));
    }

    public removeAt(x: number, y: number, redraw: boolean = true): boolean {
        const exists = this.terrain[Terrain.mkKey(x, y)]?.length;
        if (exists) {
            delete this.terrain[Terrain.mkKey(x, y)];
            if (redraw) this.redrawAt(x, y);
        }
        return !!exists;
    }

    /**
     * Same as removeAt, but send events to clients.
     * @param x
     * @param y
     */
    public eraseAt(x: number, y: number) {
        if (this.removeAt(x, y, true)) {
            TerrainEraseHandler.sendTerrainRemove(x, y);
        }
    }

    /**
     * Place the given Tile at the given coords, optionally skipping redrawing.
     * This method is smart, and auto-handles tile overlay logic.
     * @param x
     * @param y
     * @param tile
     * @param redraw
     */
    public placeAt(x: number, y: number, tile: Tile, redraw: boolean = true): boolean {
        const existing = this.getAt(x, y);
        if (existing.length && existing[existing.length-1].sprite.composite === tile.sprite.composite) {
            // The given sprite is already at the top of the stack; Skip adding because it won't do anything.
            return false;
        }
        if (tile.sprite.isBlocker) {
            this.removeAt(x, y, false);
        }
        const k = Terrain.mkKey(x, y);
        this.terrain[k] = this.terrain[k]?.filter(t => t.sprite.composite !== tile.sprite.composite) || [];  // Filter duplicates.
        this.terrain[k].push(tile);
        tile.x = x;
        tile.y = y;
        tile.z = this.tileIDX++;
        if (redraw) this.redrawAt(x, y);
        TerrainAddHandler.sendTerrainAdd(this.terrain[k]);
        return true;
    }

    /**
     * Draw the currently-selected sprite onto the given coords.
     * @param x
     * @param y
     */
    public drawAt(x: number, y: number): boolean {
        if (x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
            return false;
        }
        if (this.selectedSprite) {
            return this.placeAt(x, y, new Tile(this.selectedSprite));
        }
        return false;
    }

    public getAt(x: number, y: number): Tile[] {
        return this.terrain[Terrain.mkKey(x, y)] || [];
    }

    private redrawAt(x: number, y: number) {
        const tiles = this.getAt(x, y);
        const covered = tiles.some(t => t.sprite.isBlocker);
        const px = x * imageWidthPx;
        const py = y * imageHeightPx;
        if (!covered || !tiles.length) {
            this.ctx.clearRect(px, py, imageWidthPx, imageHeightPx);
        }
        tiles.map(t => t.sprite.drawTo(this.ctx, px, py));
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
            this.removeAt(t.x, t.y, true);
        }

        for (const k of newTerrain.terrain.tiles.sort((a, b) => a.z - b.z)) {
            const sp = newTerrain.terrain.sprites[k.spriteIdx];
            this.placeAt(k.x, k.y, new Tile(new Sprite(sp.id, sp.idx)), false);
        }
        for (const k of Object.keys(this.terrain)) {
            this.redrawAt(this.terrain[k][0].x, this.terrain[k][0].y)
        }
    }

    private static mkKey(x: number, y: number): string {
        return `${x},${y}`;
    }
}
