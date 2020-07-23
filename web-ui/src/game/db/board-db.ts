import Dexie from "dexie";
import {ProtoBoard} from "../data/protobufs/proto-tiles";
import * as encoder  from '../net/messageEncoder'
import notifications from "../../ui-components/notifications";

export interface BoardWrapper {
    name: string;
    campaignID: number;
    data: Uint8Array;
}


class BoardDB extends Dexie {
    boards: Dexie.Table<any, BoardWrapper>;

    constructor() {
        super('board-db');

        // Define tables and indexes
        this.version(1).stores({
            boards: 'campaignID, name'
        });
        this.boards = this.table("boards");
    }
}

const db = new BoardDB();

export async function save(campaignID: number, name: string, board: ProtoBoard) {
    return db.boards.put({
        name,
        campaignID,
        data: await encoder.encode(board)
    }).catch(err => {
        notifications.error('Error saving board!');
        console.error(err);
    })
}

export async function load(campaignID: number, name: string): Promise<null|ProtoBoard> {
    const res: BoardWrapper|null = await db.boards.where({campaignID, name}).first().catch(err => {
        notifications.error('Error loading board!');
        console.error(err);
    })

    if (res) {
        return encoder.decode(res.data);
    } else {
        return null;
    }
}

export async function getAvailable(campaignID: number): Promise<string[]> {
    try {
        return (await db.boards.where({campaignID}).toArray()).map(b=>b.name);
    } catch(err) {
        notifications.error('Error fetching available boards!');
        console.error(err);
        return [];
    }
}
