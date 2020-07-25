import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";

@Type.d("MediaStatusPacket")
export class MediaStatusPacket extends ProtoWrapper<MediaStatusPacket> {
    @Field.d(1, 'string', "required")
    public currentVideo: string = '';
    @Field.d(2, 'uint32', "required")
    public playbackRate: number = 1;
    @Field.d(3, 'bool', "required")
    public paused: boolean = false;
    @Field.d(4, 'uint32', "required")
    public currentTime: number = 0;
}
