import Handler from "./handler";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {Client} from "../peerconnection";
import {MediaStatusPacket} from "../packets/media-packets";
import GameController from "../../controllers/game";
import notifications from "../../../ui-components/notifications";


export default class MediaSyncHandler extends Handler {
    readonly packets: typeof ProtoWrapper[] = [MediaStatusPacket];
    private readonly controller: GameController;

    constructor(controller: GameController) {
        super();
        this.controller = controller;
    }


    async clientHandler(client: Client, packet: MediaStatusPacket): Promise<void> {
        const player = this.controller.mediaPlayer;
        if (!player) {
            notifications.warning('Media not available yet.');
            return;
        }
        if (packet.paused) {
            player.pauseVideo();
            return;
        }
        player.setPlaybackRate(packet.playbackRate);
        player.cueVideoById({
            videoId: packet.currentVideo,
            startSeconds: packet.currentTime
        });
    }

    async hostHandler(client: Client, packet: ProtoWrapper): Promise<void> {
        throw new Error('Client attempted to send media commands!');
    }
}
