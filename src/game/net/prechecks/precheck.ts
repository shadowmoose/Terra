import {Client} from "../peerconnection";
import GameController from "../../controllers/game";


export abstract class PreCheck {
    protected readonly controller: GameController;
    run: OmitThisParameter<(isHost: boolean, client: Client) => Promise<void>>;

    public constructor(controller: GameController) {
        this.controller = controller;
        this.run = this.runHandler.bind(this);
    }

    private async runHandler(isHost: boolean, client: Client){
        return isHost ? this.host(client) : this.client(client);
    }

    abstract client(client: Client): Promise<void>;
    abstract host(client: Client): Promise<void>;
}
