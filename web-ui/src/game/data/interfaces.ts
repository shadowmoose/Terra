
export interface FlatCampaign {
    name: string;
    id: number;
    boards: FlatBoard[];
    characters: FlatCharacter[];
}

export interface FlatCharacter {
    ownerIDs: string[];
    sprite: FlatSprite;
}

export interface FlatBoard {
    terrain: Record<string, FlatTile[]>;
    entities?: any; // TODO: Define and send entities.
}

export interface FlatTile {
    x: number;
    y: number;
    z: number;
    sprite: FlatSprite
}

export interface FlatSprite {
    id: string;
    idx: number;
}


export interface NewFlatTile {
    x: number;
    y: number;
    z: number;
    spr: number;
}
