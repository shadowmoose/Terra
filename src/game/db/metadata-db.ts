import {observable} from "mobx";
import {db} from './database';

export const currentUsername = observable.box<string>('');

export enum Meta {
    CERT_SEED = 'secret_cert_seed',
    USERNAME = 'username',
    CAMPAIGN_CURRENT = 'campaign_current',
    YT_PLAYER_CONFIG = 'player_config',
}

async function get(id: Meta): Promise<any> {
    return JSON.parse((await db.metadata
        .where({id})
        .first())?.val || 'null');
}

async function store(id: Meta, value: any): Promise<string> {
    return db.metadata.put({
        id,
        val: JSON.stringify(value),
    });
}

export const metadata = {
    get,
    store
};
