import {Client} from "../peerconnection";
import {PreCheck} from "./precheck";
import {MediaStatusPacket} from "../packets/media-packets";
import {getPlayerStatus} from "../../../ui-components/youtubePlayer";


export default class MediaSync extends PreCheck {
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
        const status = getPlayerStatus();

        if (status) {
            await client.send(new MediaStatusPacket().assign(status));
        }
    }
}
