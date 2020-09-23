import {Field, Type} from "protobufjs/light";
import ProtoWrapper from "./proto-wrapper";
import {ProtoSprite} from "./proto-sprite";

@Type.d("ProtoEntity")
export class ProtoEntity extends ProtoWrapper<ProtoEntity> {
    @Field.d(1, ProtoSprite, "required")
    public sprite: ProtoSprite = new ProtoSprite();

    @Field.d(2, 'int32', "required")
    public x: number = 0;

    @Field.d(3, 'int32', "required")
    public y: number = 0;

    @Field.d(4, 'bool', "required")
    public visible: boolean = false;

    @Field.d(5, 'string', "required")
    public color: string = '';

    @Field.d(6, 'string', "required")
    public id: string = '';

    @Field.d(7, 'string', "repeated")
    public owners: string[] = [];

    @Field.d(8, 'bool', "required")
    public saveToCampaign: boolean = false;

    @Field.d(9, 'string', "required")
    public name: string = '';
}
