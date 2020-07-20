import Dexie from 'dexie';
import {Tile} from "../data/interfaces/tile";

// See also: https://dexie.org/docs/Typescript#storing-real-classes-instead-of-just-interfaces

export class BoardDB extends Dexie {
    terrain: Dexie.Table<Tile, number>;

    constructor(boardName: string) {
        super(boardName);

        // Define tables and indexes
        // (Here's where the implicit table props are dynamically created)
        this.version(1).stores({
            terrain: 'x, y',
        });

        // The following lines are needed for it to work across typescript using babel-preset-typescript:
        this.terrain = this.table("terrain");
    }
}
