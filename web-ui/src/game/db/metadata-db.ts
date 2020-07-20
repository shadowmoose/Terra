import Dexie from "dexie";
import {observable} from "mobx";

export const currentUsername = observable.box<string>('');

enum Cats {
    CERT = 'cert',
    USER = 'user'
}

class MetaDB extends Dexie {
    data: Dexie.Table<any, string>;

    constructor() {
        super("metadata");

        // Define tables and indexes
        this.version(1).stores({
            data: '&[catType+dexKey]'
        });
        this.data = this.table("data");
    }

    public async get(catType: string, key: string): Promise<any> {
        return JSON.parse((await this.data
            .where({catType, dexKey: key})
            .first())?.val || 'null');
    }

    public async getAll(catType: string): Promise<any[]> {
        return (await this.data
            .where({catType}).toArray())
            .map(ob => JSON.parse(ob?.val))
    }

    public async store(catType: string, dexKey: string, val: any): Promise<string> {
        return this.data.put({
            catType,
            val: JSON.stringify(val),
            dexKey
        });
    }
}

const db = new MetaDB();

export async function getCerts(): Promise<{ pubKey: any, privKey: any }> {
    return {
        pubKey: await db.get(Cats.CERT, 'cert-public'),
        privKey: await db.get(Cats.CERT,'cert-private')
    }
}

export async function setCerts(pub: any, privateCert: any) {
    await db.store(Cats.CERT, 'cert-public', pub);
    await db.store(Cats.CERT, 'cert-private', privateCert);
}

export async function setUsername(username: string) {
    currentUsername.set(username);
    return db.store(Cats.USER, 'username', username);
}

export async function getUsername(): Promise<string> {
    const res = await db.get(Cats.USER, 'username');
    currentUsername.set(res);
    return res;
}

export async function setCurrentCampaign(campaign: number) {
    return db.store(Cats.USER, 'campaign', campaign);
}

export async function getCurrentCampaign(): Promise<number|null> {
    return db.get(Cats.USER, 'campaign');
}
