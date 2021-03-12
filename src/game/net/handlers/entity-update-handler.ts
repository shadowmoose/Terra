import Handler from "./handler";
import {broadcast, Client} from "../peerconnection";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import EntityLayer, {Entity} from "../../controllers/entities";
import {EntityDeletePacket, EntityUpdatePacket} from "../packets/entityPackets";
import {Sprite} from "../../util/sprite-loading";
import {ProtoSprite} from "../../data/protobufs/proto-sprite";
import {ProtoEntity} from "../../data/protobufs/proto-entity";


export default class EntityUpdateHandler extends Handler {
    readonly packets: typeof ProtoWrapper[] = [EntityUpdatePacket, EntityDeletePacket];
    private readonly entities: EntityLayer;

    constructor(entities: EntityLayer) {
        super();
        this.entities = entities;
    }

    async clientHandler(client: Client, packet: any): Promise<void> {
        if (packet instanceof EntityUpdatePacket) {
            for (const ent of packet.entities) {
                const sprite = new Sprite(ent.sprite.id, ent.sprite.idx);
                if (!this.entities.updateEntity(ent.id, {
                    ...ent,
                    sprite
                }, false)) {
                    console.debug('Adding new entity:', ent);
                    this.entities.addEntity(sprite, { ...ent, sprite }, false)
                }
            }
        } else if (packet instanceof EntityDeletePacket) {
            console.debug('Deleting:', packet.entityID);
            this.entities.remove(packet.entityID, false);
        }
    }

    async hostHandler(client: Client, packet: any): Promise<void> {
        if (packet instanceof EntityUpdatePacket) {
            for (const ent of packet.entities) {
                if (!this.entities.entityIsOwned(ent.id, client.userData.username)) {
                    throw Error('Client attempted to edit entity the do not own!')
                }
                const exists = this.entities.updateEntity(ent.id, {
                    x: ent.x,
                    y: ent.y
                }, false);
                if (exists) EntityUpdateHandler.sendUpdate(this.entities.getEntity(ent.id), client);
            }
        } else {
            throw Error(`Client sent invalid Entity packet! ${typeof packet}`)
        }
    }

    static sendUpdate(entity: Entity, skip?: Client) {
        if (!entity.canMove() || !entity.visible) return;
        const proto = new ProtoEntity().assign({
            ...entity,
            sprite: new ProtoSprite().assign({...entity.sprite}),
            owners: Array.from(entity.owners)
        });
        const packet = new EntityUpdatePacket().assign({entities: [proto]});
        broadcast(packet, false, skip);
    }

    static sendDelete(entity: Entity) {
        if (!entity.canMove()) return;
        const packet = new EntityDeletePacket().assign({entityID: entity.id});
        console.debug(packet);
        broadcast(packet, true);
    }
}

