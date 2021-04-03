import {AnimatedSprite} from "pixi.js";
import {UiNamePlate} from "./ui-name-plate";
import {makeTexture, releaseTexture} from "../ui-data/image-loader";
import {ENTITY_LAYER, GRID_TILE_PX, TextureKey} from "../ui-data/globals";
import {Texture} from 'pixi.js';

const entities: Record<string, Promise<UiEntity>> = {};

export class UiEntity extends AnimatedSprite {
    public readonly id: string;
    public name: string;
    public autoFlip = true;
    private textureIDs: string[] = [];
    private plate: UiNamePlate;
    private added = false;
    private destroyed = false;

    constructor(id: string, name: string) {
            super([Texture.WHITE], true);
            this.animationSpeed = 5/60;
            this.id = id;
            this.name = name;
            this.plate = new UiNamePlate(name);
    }

    place (tileX: number, tileY: number) {
        if (this.destroyed) return;
        if (!this.added) {
            this.added = true;
            this.play();
            ENTITY_LAYER.addChild(this);
        }
        if (this.autoFlip && tileX*GRID_TILE_PX !== this.position.x){
            if (tileX*GRID_TILE_PX > this.position.x) {
                this.scale.x = -1;
                this.anchor.x = 1;
            } else {
                this.scale.x = 1;
                this.anchor.x = 0;
            }
        }

        this.position.set(tileX * GRID_TILE_PX, tileY * GRID_TILE_PX);
        this.plate.place(this.position.x + GRID_TILE_PX/2, this.position.y);
        return this;
    }

    /**
     * Destroy and clean up this Entity and its name plate/textures.
     * Also flips a flag to prevent any race conditions with destroying and adding.
     */
    remove() {
        if (!this.destroyed) {
            this.destroyed = true;
            this.stop();
            this.destroy();
            this.plate.remove();
            this.textureIDs.forEach(t => releaseTexture(t));
        }
    }

    setColor(color: string) {
        this.plate.setColor(color);
        return this;
    }

    setHidden(hidden: boolean) {
        this.alpha = hidden ? 0.5 : 1;
        return this;
    }

    setName(name: string) {
        this.name = name;
        this.plate.setName(name);
        return this;
    }

    setShowName(show: boolean) {
        this.plate.setVisible(show);
    }

    async setTextures(textures: TextureKey[]) {
        const newIDs = textures.map(t => t.uid);
        this.stop();
        Promise.all(textures.map(t => makeTexture(t))).then(loaded => {
            this.textureIDs.forEach(tid => {
                if (!newIDs.find(id => id === tid)) releaseTexture(tid);
            });
            this.textureIDs = textures.map(t => t.uid);
            this.textures = loaded;
            this.gotoAndPlay(1);
        })
        return this;
    }
}

/**
 * Creates a unique entity with the given ID, or returns the existing entity that matches.
 * @param id
 * @param name
 * @param textures
 */
export async function createEntity(id: string, name: string, textures: TextureKey[]) {
    if (entities[id]) {
        return entities[id];
    }
    return entities[id] = new UiEntity(id, name).setTextures(textures);
}

/**
 * Fetch the requested entity, once it is finished loading.
 * @param id
 */
export async function getEntity(id: string) {
    if (entities[id]) {
        return await entities[id];
    }
    return null;
}

/**
 * Wait for the entity to load, if required, then destroy it safely.
 * @param id
 */
export async function releaseEntity(id: string) {
    if (entities[id]) {
        const prom = entities[id];
        delete entities[id];
        (await prom).remove();
    } else {
        console.warn("Tried to delete missing entity:", id);
    }
}


// @ts-ignore
window.debugEntityList = entities;
