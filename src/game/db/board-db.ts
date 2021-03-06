import {db} from './database';
import Dexie from "dexie";
import {ProtoBoard} from "../data/protobufs/proto-tiles";
import * as encoder  from '../net/messageEncoder'
import notifications from "../../ui-components/notifications";

export interface BoardWrapper {
    name: string;
    campaignID: number;
    data: Uint8Array;
}


export async function save(campaignID: number, name: string, board: ProtoBoard) {
    try {
        console.log('Persistent storage enabled:', await navigator.storage.persist());
    } catch (err) {
        console.error(err);
    }
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
        return (await db.boards.where('[campaignID+name]').between([campaignID, Dexie.minKey], [campaignID, Dexie.maxKey]).toArray()).map(b=>b.name);
    } catch(err) {
        notifications.error('Error fetching available boards!');
        console.error(err);
        return [];
    }
}


export async function deleteBoard(campaignID: number, name: string) {
    return db.boards.where({campaignID, name}).delete();
}
