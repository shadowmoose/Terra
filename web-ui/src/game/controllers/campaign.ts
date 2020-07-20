import {observable} from "mobx";
import {Entity} from "./entities";

export default class Campaign {
    public readonly name: string;
    @observable public readonly boards: string[] = ['Test Board One', 'Longer-named test Board Two', "TB3"];
    @observable public loadedBoard: string|null = null;
    @observable public readonly characters: Entity[] = [];
    public readonly id: number = -1;
    public readonly timeCreated = Date.now();

    constructor(name: string) {
        this.name = name;
    }
}
