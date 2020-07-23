import Handler from "./handler";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {ProtoBoard} from "../../data/protobufs/proto-tiles";
import {Client} from "../peerconnection";
import GameController from "../../controllers/game";


export default class BoardReloadHandler extends Handler {
    readonly packets: typeof ProtoWrapper[] = [ProtoBoard];
    private readonly controller: any;

    constructor(controller: GameController) {
        super();
        this.controller = controller;
    }

    async clientHandler(client: Client, packet: ProtoBoard): Promise<void> {
        return this.controller.loadFromProtoBoard(packet);
    }

    async hostHandler(client: Client, packet: ProtoWrapper): Promise<void> {
        throw Error('Client tried to send Board Update!')
    }
}
