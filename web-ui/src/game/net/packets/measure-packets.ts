import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";


@Type.d("MeasurePacket")
export class MeasurePacket extends ProtoWrapper<MeasurePacket> {
    @Field.d(1, 'int32', "required")
    public px: number = 0;
    @Field.d(2, 'int32', "required")
    public py: number = 0;
    @Field.d(3, 'int32', "required")
    public tw: number = 0;
    @Field.d(4, 'int32', "required")
    public th: number = 0;
    @Field.d(5, 'int32', "required")
    public color: number = 0;
    @Field.d(6, 'float', "required")
    public angle: number = 0;
    @Field.d(7, 'bool', "required")
    public visible: boolean = false;
    @Field.d(8, 'string', "required")
    public type: string = '';
    @Field.d(9, 'int32', "required")
    public thickness: number = 0;
    @Field.d(10, 'int32', "required")
    public fill: number = 0;
    @Field.d(11, 'float', "required")
    public alpha: number = 0;
    @Field.d(12, 'int32', "required")
    public tx: number = 0;
    @Field.d(13, 'int32', "required")
    public ty: number = 0;
}
