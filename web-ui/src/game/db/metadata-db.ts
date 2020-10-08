import Dexie from "dexie";
import {observable} from "mobx";

export const currentUsername = observable.box<string>('');

export enum Meta {
    CERT_SEED = 'secret_cert_seed',
    USERNAME = 'username',
    CAMPAIGN_CURRENT = 'campaign_current',
    PLAYER_CONFIG = 'player_config',
}


class MetaDB extends Dexie {
    data: Dexie.Table<any, string>;

    constructor() {
        super("metadata-db");

        // Define tables and indexes
        this.version(1).stores({
            data: 'id'
        });
        this.data = this.table("data");
    }

    public async get(id: Meta): Promise<any> {
        return JSON.parse((await this.data
            .where({id})
            .first())?.val || 'null');
    }

    public async store(id: Meta, value: any): Promise<string> {
        return this.data.put({
            id,
            val: JSON.stringify(value),
        });
    }
}

export const metadata = new MetaDB();
