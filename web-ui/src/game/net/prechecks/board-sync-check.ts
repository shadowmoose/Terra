import * as packer from '../../data/board-packer.worker';
import {Client} from "../peerconnection";
import {ProtoBoard} from "../../data/protobufs/proto-tiles";
import {PreCheck} from "./precheck";
import {Sprite} from "../../util/sprite-loading";
import {ProtoEntity} from "../../data/protobufs/proto-entity";


export default class BoardSync extends PreCheck {
    /**
     * Waits for a ProtoBoard, which is then used to seed the initial board status.
     * @param client
     */
    async client(client: Client) {
        const pb: ProtoBoard = await client.getNextPacket(ProtoBoard);
        this.controller.terrain.setDirectMap(pb);

        this.controller.entities.getEntityList().forEach(e => this.controller.entities.remove(e.id, false));
        pb.entities.forEach(ent => {
            const sprite = new Sprite(ent.sprite.id, ent.sprite.idx);
            this.controller.entities.addEntity(sprite, {
                ...ent,
                sprite
            }, false)
        });
    }

    /**
     * Issues a ProtoBoard, containing the initial board status, to the client.
     * @param client
     */
    async host(client: Client) {
        const tiles = Object.values(this.controller.terrain.getDirectMap()).flat();
        const pb = new ProtoBoard().assign(await packer.packBoard(tiles));

        pb.entities = this.controller.entities.getEntityList().map(e => ProtoEntity.fromEntity(e));

        await client.send(pb);
    }
}
