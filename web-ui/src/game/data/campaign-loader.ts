import {getAllCampaigns, getCampaign, saveCampaign, createCampaign} from "../db/campaign-db";
import Campaign from "../controllers/campaign";

export default class CampaignLoader {
    /**
     * Get an array of all saved Campaign objects.
     */
    public static async getAvailable(): Promise<Campaign[]> {
        return getAllCampaigns()
    }

    /**
     * Load a Campaign object from the db, using its unique ID.
     * @param id
     */
    public static async loadCampaign(id: number): Promise<Campaign> {
        return getCampaign(id);
    }

    /**
     * Save an existing Campaign object back to the database.
     * @param camp
     */
    public static async saveCampaign(camp: Campaign): Promise<number> {
        return saveCampaign({
            ...camp,
            boards: Array.from(camp.boards)
        });
    }

    /**
     * Create a new Campaign object, pre-saved in the database.
     * @param name
     */
    public static async createCampaign(name: string): Promise<Campaign> {
        return createCampaign(name);
    }
}
