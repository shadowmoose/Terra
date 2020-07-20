import {Client} from "../peerconnection";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";

export default abstract class Handler {
    /** The type of packet this handler is listening for. */
    public abstract readonly packets: typeof ProtoWrapper[];
    private isHost: boolean = false;

    setHost(isHost: boolean) {
        this.isHost = isHost;
    }

    async handlePacket(client: Client, packet: ProtoWrapper) {
        return this.isHost ? this.hostHandler(client, packet) : this.clientHandler(client, packet);
    }

    abstract async clientHandler(client: Client, packet: ProtoWrapper): Promise<void>;
    abstract async hostHandler(client: Client, packet: ProtoWrapper): Promise<void>;
}
