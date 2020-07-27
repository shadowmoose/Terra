import {TerrainAddPacket, TerrainErasePacket} from "./terrainPackets";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {ProtoBoard, ProtoTileStack} from "../../data/protobufs/proto-tiles";
import {EntityDeletePacket, EntityUpdatePacket} from "./entityPackets";
import {PingPacket, ReadyPacket, SignaturePacket} from "./util-packets";
import {MediaRequestPacket, MediaStatusPacket} from "./media-packets";

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
    MediaRequestPacket
];

export const packetMap: Record<string, number> = {};

for (let i=0; i<packetList.length; i++) {
    packetMap[packetList[i].$type.name] = i;
}
