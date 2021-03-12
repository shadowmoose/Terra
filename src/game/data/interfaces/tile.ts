import {Sprite} from "../../util/sprite-loading";

export class Tile {
    public x: number = 0;
    public y: number = 0;
    public z: number = 0;
    public sprite: Sprite;

    constructor(sprite: Sprite) {
        this.sprite = sprite;
    }
}
