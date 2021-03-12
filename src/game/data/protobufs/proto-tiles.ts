import {Field, Type} from "protobufjs/light";
import ProtoWrapper from './proto-wrapper';
import {ProtoSprite} from "./proto-sprite";
import {ProtoEntity} from "./proto-entity";


@Type.d("ProtoTile")
export class ProtoTile extends ProtoWrapper<ProtoTile> {
    @Field.d(1, "int32", "required", 0)
    public x: number = 0;

    @Field.d(2, "int32", "required", 0)
    public y: number = 0;

    @Field.d(3, "int32", "required", 0)
    public z: number = 0;

    @Field.d(4, "int32", "required", 0)
    public spriteIdx: number = 0;
}

@Type.d("ProtoTileStack")
export class ProtoTileStack extends ProtoWrapper<ProtoBoard> {
    @Field.d(1, ProtoTile, "repeated")
    public tiles: ProtoTile[] = [];

    @Field.d(2, ProtoSprite, "repeated")
    public sprites: ProtoSprite[] = [];
}


@Type.d("ProtoBoard")
export class ProtoBoard extends ProtoWrapper<ProtoBoard> {
    @Field.d(1, ProtoTileStack, "required")
    public terrain: ProtoTileStack|null = null;
    @Field.d(2, ProtoEntity, "repeated")
    public entities: ProtoEntity[] = [];
}
