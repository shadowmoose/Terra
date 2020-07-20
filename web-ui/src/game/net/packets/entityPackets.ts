import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {ProtoEntity} from "../../data/protobufs/proto-entity";


@Type.d("EntityUpdatePacket")
export class EntityUpdatePacket extends ProtoWrapper<EntityUpdatePacket> {
    @Field.d(1, ProtoEntity, "repeated")
    public entities: ProtoEntity[] = [];
}


@Type.d("EntityDeletePacket")
export class EntityDeletePacket extends ProtoWrapper<EntityDeletePacket> {
    @Field.d(1, 'string', "required")
    public entityID: string = '';
}
