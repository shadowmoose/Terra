import Dexie from "dexie";
import {BoardWrapper} from "./board-db";
import Campaign from "../controllers/campaign";
import {UserData} from "./user-db";
import {exportDB, importDB} from "dexie-export-import";


class DB extends Dexie {
    boards: Dexie.Table<any, BoardWrapper>;
    campaigns: Dexie.Table<any, Campaign>;
    metadata: Dexie.Table<any, string>;
    users: Dexie.Table<any, UserData>;

    constructor() {
        super('terra-db');

        // Define tables and indexes
        this.version(1).stores({
            boards: '&[campaignID+name]',
            campaigns: '++id, name',
            metadata: 'id',
            users: '++id, &username, *keyCodes, lastSeen'
        });
        this.boards = this.table("boards");
        this.campaigns = this.table("campaigns");
        this.metadata = this.table("metadata");
        this.users = this.table("users");
    }

    /**
     * Replaces the database with the given Blob data, then reloads the page.
     * If cb is given, waits for the callback before reloading.
     * @param data
     * @param cb
     */
    async importData(data: Blob, cb?: Function) {
        console.debug('Restoring database from blob...');
        await this.delete();
        await importDB(data);
        console.log("Import complete");
        if (cb) await cb();
        // @ts-ignore
        window.location = window.location.href.split('#')[0];
    }

    async toBlob() {
        // @ts-ignore
        return await exportDB(this, {
            prettyJson: false,
            progressCallback: (progress: any) => {
                console.debug('\t+ Packing DB:', progress);
            }
        });
    }
}

export const db = new DB();

db.on("ready", async () => {
    if (await db.metadata.count() <= 0) {
        console.debug("Migrating from old databases...");
        await copyOldDB(db, 'metadata-db', 'data', 'metadata');
        await copyOldDB(db, 'campaign-db', 'campaigns', 'campaigns');
        await copyOldDB(db, 'user-db', 'users', 'users');
        await copyOldDB(db, 'board-db', 'boards', 'boards');
    }
});

db.open();


async function copyOldDB(newDB: DB, dbName: string, tableName: string, newTable: string) {
    if (await Dexie.exists(dbName)) {
        const d = new Dexie(dbName);
        await d.open();
        console.log('\t+', dbName, tableName);
        for (const tbl of d.tables) {
            if (tbl.name === tableName) {
                for (const ele of await tbl.toArray()) {
                    console.log('Migrating:', ele);
                    // @ts-ignore
                    await newDB[newTable].add(ele);
                }
            }
        }
        d.close();
        d.delete();
    }
}
