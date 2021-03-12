import {SpriteInterface} from "./sprite";

/**
 * The most basic representation of an Entity.
 * Does not include all the properties a Board Entity will use.
 */
export interface EntityInterface {
    sprite: SpriteInterface;
    name: string;
    color: string;
    id: string;
    owners: string[];
    saveToCampaign: boolean;
}
