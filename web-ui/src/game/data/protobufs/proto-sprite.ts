import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "./proto-wrapper";

@Type.d("ProtoSprite")
export class ProtoSprite extends ProtoWrapper<ProtoSprite> {
    @Field.d(1, "string", "required", "")
    public id: string = '';

    @Field.d(2, "int32", "required", 0)  // Use "sint32" if idx will be negative often.
    public idx: number = 0;
}
