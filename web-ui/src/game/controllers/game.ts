import {CanvasContainer} from "./canvas";
import {waitForSpriteLoad} from "../util/sprite-loading";
import Terrain from "./terrain";
import {boardTileHeight, boardTileWidth, imageHeightPx, imageWidthPx} from "../consts";
import {observable} from "mobx";
import {getMyRoomID, initKeys} from "../net/crypter";
import * as connection from '../net/peerconnection'
import {NetworkStatus} from "../net/peerconnection";
import EntityLayer from "./entities";
import HandShakeCheck from "../net/prechecks/signature-check";
import BoardSync from "../net/prechecks/board-sync-check";
import {PreCheck} from "../net/prechecks/precheck";
import Handler from "../net/handlers/handler";
import TerrainAddHandler from "../net/handlers/terrain-add-handler";
import TerrainEraseHandler from "../net/handlers/terrain-erase-handler";
import EntityUpdateHandler from "../net/handlers/entity-update-handler";
import Lobby from "./lobby";
import PingHandler from "../net/handlers/ping-handler";
import Campaign from "./campaign";


export default class GameController {
    public canvasContainer: CanvasContainer;
    public terrain: Terrain;
    public entities: EntityLayer;
    @observable public ready: boolean = false;
    private readonly preChecks: PreCheck[];
    private readonly handlers: Handler[];
    public readonly lobby: Lobby;
    @observable public campaign: Campaign|null = null;

    constructor() {
        this.canvasContainer = new CanvasContainer(1, 1);
        this.terrain = new Terrain(boardTileWidth, boardTileHeight);
        this.entities = new EntityLayer(boardTileWidth, boardTileHeight);
        this.lobby = new Lobby();

        // Initialize networking stuff:
        this.preChecks = [
            new HandShakeCheck(this),
            new BoardSync(this)
        ];
        this.handlers = [
            new TerrainAddHandler(this.terrain),
            new TerrainEraseHandler(this.terrain),
            new EntityUpdateHandler(this.entities),
            new PingHandler()
        ];

        // TODO: Remove after testing:
        /*CampaignLoader.getAvailable().then(async res => {
            console.log('Campaigns Available:', res);
            const camp = res[0]; // await CampaignLoader.createCampaign('test-campaign-1');
            const save = await CampaignLoader.saveCampaign(camp);
            console.log('saved:', save);
            console.log('Campaign:', camp);
        })*/
    }

    public async start() {
        this.canvasContainer.addLayer(this.terrain);
        this.canvasContainer.addLayer(this.entities);

        waitForSpriteLoad.then(async () => {
            console.debug('Sprite loader ready!');
            this.canvasContainer.setCanvasSize(boardTileWidth * imageWidthPx, boardTileHeight * imageHeightPx);

            await initKeys();
            console.log('Local Room ID Key:', await getMyRoomID());

            const hash = window.location.hash.replace('#', '');
            if (hash) {
                if ((await getMyRoomID()) === hash) {
                    // This is our URL - hosting.
                    await this.initHost();
                } else {
                    // At someone else's URL - join them.
                    await this.initClient(hash);
                }
            }
            this.ready = true;
        });

        // Treadmill to block back button:
        window.history.pushState(null, document.title, window.location.href);
        window.addEventListener('popstate', () => {
            window.history.pushState(null, document.title, window.location.href);
        });
    }

    public async initHost(): Promise<void> {
        await connection.kill();
        console.log('Hosting lobby at:', await getMyRoomID());
        window.location.hash = await getMyRoomID();

        this.handlers.forEach(h => h.setHost(true));
        connection.setHandlers(this.handlers, this.preChecks);

        await connection.openHost();
    }

    public async initClient(connectID: string) {
        if (connection) {
            await connection.kill();
        }
        console.log('Connecting to host:', connectID);
        window.location.hash = connectID;

        this.handlers.forEach(h => h.setHost(false));
        connection.setHandlers(this.handlers, this.preChecks)

        await connection.connectTo(connectID);
    }

    get isNetworkReady() {
        return connection.netStatus.get() === NetworkStatus.CONNECTED;
    }
}
