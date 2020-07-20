import Dexie from "dexie";
import {ProtoBoard} from "../data/protobufs/proto-tiles";
import {EntityUpdatePacket} from "../net/packets/entityPackets";


export default class BoardDB extends Dexie {
    boards: Dexie.Table<any, Uint8Array>;

    constructor() {
        super('boards');

        // Define tables and indexes
        this.version(1).stores({
            boards: '&[name, campaignID]'
        });
        this.boards = this.table("boards");
    }
}

const db = new BoardDB();

export async function save(board: ProtoBoard, entities: EntityUpdatePacket) {

}
