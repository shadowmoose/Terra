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
    private static timeout: any = null;
    private static tiles: Tile[][] = [];
    readonly packets: typeof ProtoWrapper[] = [TerrainAddPacket];
    private readonly terrain: Terrain;

    constructor(terrain: Terrain) {
        super();
        this.terrain = terrain;

        TerrainAddHandler.broadcastChanges().then();
    }

    async clientHandler(client: Client, packet: TerrainAddPacket): Promise<void> {
        for (const data of packet.tileStacks) {
            if (!data) return;
            const stack = data.tiles;

            if (stack.length) {
                this.terrain.removeAt(stack[0].x, stack[0].y, false);
                for (let i=0; i < stack.length; i++) {
                    const dt = stack[i];
                    const sp = data.sprites[dt.spriteIdx];
                    const t = new Tile(new Sprite(sp.id, sp.idx));
                    this.terrain.placeAt(dt.x, dt.y, t, i === stack.length-1);
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

            for (let i=TerrainAddHandler.tiles.length-1; i>-1; i--) {
                const t = TerrainAddHandler.tiles[i];
                TerrainAddHandler.tiles.splice(i, 1);
                packedStacks.push(await packer.packTiles(t));
            }

            broadcast(new TerrainAddPacket().assign({
                tileStacks: packedStacks
            }), true);
        }

        TerrainAddHandler.timeout = setTimeout(async () => {
            await TerrainAddHandler.broadcastChanges();
        }, 200);
    }

    static sendTerrainAdd(tiles: Tile[]) {
        if (isHost()) TerrainAddHandler.tiles.push(tiles);
    }
}

