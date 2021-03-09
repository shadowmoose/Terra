import {Sprite} from "../util/sprite-loading";
import {v4 as uuid} from 'uuid';
import {observable} from "mobx";
import {isHost} from "../net/peerconnection";
import EntityUpdateHandler from "../net/handlers/entity-update-handler";
import {currentUsername} from "../db/metadata-db";
import {EntityInterface} from "../data/interfaces/entity";
import * as ENTITIES from '../renderer/ui-components/ui-entity';


export class Entity implements EntityInterface{
    @observable sprite: Sprite;
    @observable name: string;
    @observable color: string = '#000000';
    id: string;
    x: number = 0;
    y: number = 0;
    @observable visible: boolean = true;
    @observable owners: string[] = [];
    @observable saveToCampaign: boolean = false;

    constructor(sprite: Sprite, init?: Partial<Entity>) {
        this.sprite = sprite;
        this.id = uuid();
        this.name = this.id;
        if (init) {
            Object.assign(this, init)
        }
    }

   canMove() {
        return isHost() || this.owners.includes(currentUsername.get());
   }
}

export default class EntityLayer {
    private readonly entities: Record<string, Entity> = {};
    @observable public selected: Entity|null = null;
    @observable public isDirty: boolean = false;

    public remove(id: string, sendUpdate: boolean = true): boolean {
        const existing = this.entities[id];
        if (existing) {
            ENTITIES.releaseEntity(id).catch(console.error);
            delete this.entities[id];
            if (sendUpdate) EntityUpdateHandler.sendDelete(existing);
        }
        if (existing === this.selected) this.selected = null;
        return !!existing;
    }

    public addEntity(sprite: Sprite, opts?: Partial<Entity>, sendUpdate: boolean = true) {
        const ent = new Entity(sprite, opts);

        this.remove(ent.id, sendUpdate);

        ENTITIES.createEntity(ent.id, ent.name, sprite.textureData).then(e => {
            e.setColor(ent.color);
            e.setHidden(!ent.visible);
            e.place(ent.x, ent.y);
        }).catch(console.error);

        this.entities[ent.id] = ent;

        if (sendUpdate) {
            EntityUpdateHandler.sendUpdate(ent);
            this.isDirty = true;
        }

        return ent;
    }

    public select(entEle: Entity|null) {
        this.selected = entEle;
        console.debug('Selected entity:', this.selected);
    }

    public entityIsOwned(id: string, checkOwner: string) {
        const existing = this.entities[id];
        if (existing) {
            return existing.owners.includes(checkOwner);
        }
        return false;
    }

    public updateEntity(id: string, props: Partial<Entity>, sendUpdate: boolean=true) {
        const existing = this.entities[id];
        if (existing) {
            const oldSprite = existing.sprite;

            Object.assign(existing, props);
            ENTITIES.getEntity(id).then(ent => {
                if (ent) {
                    ent.setColor(existing.color);
                    ent.setHidden(!existing.visible);
                    ent.setName(existing.name);
                    ent.place(existing.x, existing.y);
                    if (existing.sprite.composite !== oldSprite.composite) {
                        ent.setTextures(existing.sprite.textureData).catch(console.error);
                    }
                }
            })
            if (sendUpdate) {
                EntityUpdateHandler.sendUpdate(existing);
                this.isDirty = true;
            }
        }
        return !!existing;
    }

    public setEntitySprite(entity: Entity, sprite: Sprite) {
        entity.sprite = sprite;
        ENTITIES.getEntity(entity.id).then(e => {
            e?.setTextures(sprite.textureData);
        })
    }

    /**
     * Directly export the underlying entity list, for serialization.
     */
    getEntityList() {
        return Object.values(this.entities);
    }
}
