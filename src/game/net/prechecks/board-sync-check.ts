import {Client} from "../peerconnection";
import {PreCheck} from "./precheck";


export default class BoardSync extends PreCheck {
    /**
     * Waits for a ProtoBoard, which is then used to seed the initial board status.
     * @param client
     */
    async client(client: Client) {}

    /**
     * Issues a ProtoBoard, containing the initial board status, to the client.
     * @param client
     */
    async host(client: Client) {
        await client.send(await this.controller.buildProtoBoard(false));
    }
}
