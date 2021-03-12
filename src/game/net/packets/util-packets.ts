import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";

@Type.d("PingPacket")
export class PingPacket extends ProtoWrapper<PingPacket> {}

@Type.d("SignaturePacket")
export class SignaturePacket extends ProtoWrapper<SignaturePacket> {
    @Field.d(1, "string", "required", 'def')
    public username: string = '';
}

@Type.d("ReadyPacket")
export class ReadyPacket extends ProtoWrapper<ReadyPacket> {}
