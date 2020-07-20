import Handler from "./handler";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {PingPacket} from "../packets/util-packets";
import {Client} from "../peerconnection";


export default class PingHandler extends Handler {
    readonly packets: typeof ProtoWrapper[] = [PingPacket];

    async clientHandler(client: Client, packet: ProtoWrapper): Promise<void> {
        PingHandler.handlePing(client);
    }

    async hostHandler(client: Client, packet: ProtoWrapper): Promise<void> {
        PingHandler.handlePing(client);
    }

    private static handlePing(client: Client) {
        client.lastPing = Date.now();
    }
}
