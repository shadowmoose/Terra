import {TerrainAddPacket, TerrainErasePacket} from "./terrainPackets";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {ProtoBoard, ProtoTileStack} from "../../data/protobufs/proto-tiles";
import {EntityDeletePacket, EntityUpdatePacket} from "./entityPackets";
import {PingPacket, ReadyPacket, SignaturePacket} from "./util-packets";
import {MediaRequestPacket, MediaStatusPacket} from "./media-packets";
import {MeasurePacket} from "./measure-packets";

/**
 * The order of this list is important, as the index represents the packet ID for messages and saved boards.
 */
export const packetList: typeof ProtoWrapper[] = [
    SignaturePacket,
    ReadyPacket,
    TerrainErasePacket,
    TerrainAddPacket,
    ProtoBoard,
    ProtoTileStack,
    EntityUpdatePacket,
    EntityDeletePacket,
    PingPacket,
    MediaStatusPacket,
    MediaRequestPacket,
    MeasurePacket
];

export const packetMap: Record<string, number> = {};

for (let i=0; i<packetList.length; i++) {
    packetMap[packetList[i].$type.name] = i;
}
