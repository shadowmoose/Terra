import Campaign from "../controllers/campaign";
import stripProxy from "../util/deproxy";
import {db} from './database';

db.campaigns.mapToClass(Campaign);

export async function saveCampaign(camp: Campaign) {
    console.info('Saved campaign:', camp);
    return db.campaigns.update(camp.id, stripProxy(camp));
}

export async function createCampaign(name: string): Promise<any> {
    const obj = {...new Campaign(name), id: null};
    delete obj.id;

    const res = await db.campaigns.put(stripProxy(obj));
    console.info('Saved new campaign:', res);
    return db.campaigns.get({id: res});
}

export async function getAllCampaigns(): Promise<Campaign[]> {
    return db.campaigns.toArray()
}

export async function getCampaign(id: number): Promise<Campaign|null> {
    return db.campaigns.where({id}).first()
}
