import Handler from "./handler";
import {broadcast, Client, isHost} from "../peerconnection";
import Terrain from "../../controllers/terrain";
import {Sprite} from "../../util/sprite-loading";
import {ProtoTileStack} from "../../data/protobufs/proto-tiles";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import * as packer from '../../data/board-packer.worker';
import {TerrainAddPacket} from "../packets/terrainPackets";
import {Tile} from "../../data/interfaces/tile";


export default class TerrainAddHandler extends Handler {
    private static tiles: Tile[][] = [];
    readonly packets: typeof ProtoWrapper[] = [TerrainAddPacket];
    private readonly terrain: Terrain;

    constructor(terrain: Terrain) {
        super();
        this.terrain = terrain;
    }

    static pollChanges() {
        setTimeout(async () => {
            await TerrainAddHandler.broadcastChanges();
            TerrainAddHandler.pollChanges()
        }, 200);
    }

    async clientHandler(client: Client, packet: TerrainAddPacket): Promise<void> {
        for (const data of packet.tileStacks) {
            if (!data) return;
            const stack = data.tiles;

            if (stack.length) {
                this.terrain.removeAt(stack[0].x, stack[0].y);
                for (let i=0; i < stack.length; i++) {
                    const dt = stack[i];
                    const sp = data.sprites[dt.spriteIdx];
                    const t = new Tile(new Sprite(sp.id, sp.idx));
                    this.terrain.placeAt(dt.x, dt.y, t, false);
                }
            }
        }
    }

    async hostHandler(client: Client, packet: any): Promise<void> {
        throw Error('Client sent host new Terrain data. Not allowed.')
    }

    static async broadcastChanges() {
        if (TerrainAddHandler.tiles.length) {
            const packedStacks: ProtoTileStack[] = []
            const updateTiles = TerrainAddHandler.tiles.splice(0, TerrainAddHandler.tiles.length);

            for (const t of updateTiles) {
                packedStacks.push(await packer.packTiles(t));
            }

            await broadcast(new TerrainAddPacket().assign({
                tileStacks: packedStacks
            }), true);
        }
    }

    static sendTerrainAdd(tiles: Tile[]) {
        if (isHost()) TerrainAddHandler.tiles.push(tiles);
    }
}

TerrainAddHandler.pollChanges();
