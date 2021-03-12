import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {ProtoTileStack} from "../../data/protobufs/proto-tiles";

@Type.d("TerrainAddPacket")
export class TerrainAddPacket extends ProtoWrapper<TerrainAddPacket> {
    @Field.d(1, ProtoTileStack, "repeated")
    public tileStacks: ProtoTileStack[] = [];
}

@Type.d("TerrainCoordPacket")
export class TerrainCoordPacket extends ProtoWrapper<TerrainCoordPacket> {
    @Field.d(1, 'int32', "required")
    public x: number = 0;
    @Field.d(2, 'int32', "required")
    public y: number = 0;
}

@Type.d("TerrainErasePacket")
export class TerrainErasePacket extends ProtoWrapper<TerrainErasePacket> {
    @Field.d(1, TerrainCoordPacket, "repeated")
    public coords: TerrainCoordPacket[] = [];
}
