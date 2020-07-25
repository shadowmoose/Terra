import {Client} from "../peerconnection";
import {PreCheck} from "./precheck";
import {MediaStatusPacket} from "../packets/media-packets";
import YouTube from "react-youtube";


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
        const player = this.controller.mediaPlayer;
        if (player) {
            const currentVideo: string = player.getVideoData().video_id;
            const currentTime: number = Math.floor(player.getCurrentTime());
            const playbackRate: number = player.getPlaybackRate();
            const paused: boolean = player.getPlayerState() === YouTube.PlayerState.PAUSED;

            await client.send(new MediaStatusPacket().assign({
                currentVideo,
                currentTime,
                playbackRate,
                paused
            }));
        }
    }
}
