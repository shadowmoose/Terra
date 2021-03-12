import {observable} from "mobx";
import {EntityInterface} from "../data/interfaces/entity";

export default class Campaign {
    public readonly name: string;
    @observable public boards: string[] = [];
    @observable public loadedBoard: string|null = null;
    @observable.shallow public readonly characters: EntityInterface[] = [];
    public readonly id: number = -1;
    public readonly timeCreated = Date.now();

    constructor(name: string) {
        this.name = name;
    }
}
