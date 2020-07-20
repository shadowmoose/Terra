import Handler from "./handler";
import {broadcast, Client, isHost} from "../peerconnection";
import Terrain from "../../controllers/terrain";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {TerrainCoordPacket, TerrainErasePacket} from "../packets/terrainPackets";

export default class TerrainEraseHandler extends Handler {
    private static tiles: Set<TerrainCoordPacket> = new Set();
    readonly packets: typeof ProtoWrapper[] = [TerrainErasePacket];
    private readonly terrain: Terrain;

    constructor(terrain: Terrain) {
        super();
        this.terrain = terrain;

        TerrainEraseHandler.broadcastChanges().then();
    }

    async clientHandler(client: Client, packet: TerrainErasePacket): Promise<void> {
        for (const t of packet.coords) {
            this.terrain.removeAt(t.x, t.y, true);
        }
    }

    async hostHandler(client: Client, packet: ProtoWrapper): Promise<void> {
        throw Error('Client attempted to erase terrain. Not allowed.')
    }

    static sendTerrainRemove(x: number, y: number) {
        if (isHost()) TerrainEraseHandler.tiles.add(new TerrainCoordPacket().assign({ x, y}));
    }

    static async broadcastChanges() {
        if (TerrainEraseHandler.tiles.size) {
            const tep  = new TerrainErasePacket().assign({
                coords: Array.from(TerrainEraseHandler.tiles)
            });
            TerrainEraseHandler.tiles.clear();
            await broadcast(tep, true);
        }
        setTimeout(TerrainEraseHandler.broadcastChanges, 250);
    }
}
