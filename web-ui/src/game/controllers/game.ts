import {CanvasContainer} from "./canvas";
import {Sprite, waitForSpriteLoad} from "../util/sprite-loading";
import Terrain from "./terrain";
import {boardTileHeight, boardTileWidth, imageHeightPx, imageWidthPx} from "../consts";
import {observable} from "mobx";
import {getMyRoomID, initKeys} from "../net/crypter";
import * as connection from '../net/peerconnection'
import {broadcast, NetworkStatus} from "../net/peerconnection";
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
import * as boardDB from "../db/board-db";
import {ProtoBoard} from "../data/protobufs/proto-tiles";
import * as packer from "../data/board-packer.worker";
import {ProtoEntity} from "../data/protobufs/proto-entity";
import CampaignLoader from "../data/campaign-loader";
import BoardReloadHandler from "../net/handlers/board-reload-handler";


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
            new PingHandler(),
            new BoardReloadHandler(this)
        ];
    }

    /**
     * Starts the main game client, waiting for the Sprite Loader to become ready.
     * Also initializes any required keys or other async setup.
     * Automatically starts the Client/Host connection if a URL Hash has been set already.
     */
    public async start() {
        this.canvasContainer.addLayer(this.terrain);
        this.canvasContainer.addLayer(this.entities);

        await waitForSpriteLoad;
        console.debug('Sprite loader ready!');

        this.canvasContainer.setCanvasSize(boardTileWidth * imageWidthPx, boardTileHeight * imageHeightPx);

        await initKeys();
        console.log('Local Room ID Key:', await getMyRoomID());

        const hash = window.location.hash.replace('#', '');
        if (hash) {
            if ((await getMyRoomID()) === hash) {
                // This is our URL - hosting.
                await this.startHost();
            } else {
                // At someone else's URL - join them.
                await this.startClient(hash);
            }
        }
        this.ready = true;

        // Treadmill to block back button:
        window.history.pushState(null, document.title, window.location.href);
        window.addEventListener('popstate', () => {
            window.history.pushState(null, document.title, window.location.href);
        });
    }

    public async startHost(): Promise<void> {
        await connection.kill();
        this.lobby.pendingLogins.forEach(pu => this.lobby.rejectUser(pu));

        console.log('Hosting lobby at:', await getMyRoomID());
        window.location.hash = await getMyRoomID();

        this.handlers.forEach(h => h.setHost(true));
        connection.setHandlers(this.handlers, this.preChecks);

        await connection.openHost();
    }

    public async startClient(connectID: string) {
        await connection.kill();
        this.lobby.pendingLogins.forEach(pu => this.lobby.rejectUser(pu));

        console.log('Connecting to host:', connectID);
        window.location.hash = connectID;

        this.handlers.forEach(h => h.setHost(false));
        connection.setHandlers(this.handlers, this.preChecks)

        await connection.connectTo(connectID);
    }

    get isNetworkReady() {
        return connection.netStatus.get() === NetworkStatus.CONNECTED;
    }

    /**
     * Loads the given board, and broadcasts the new board state to all clients.
     * @param name
     */
    public async loadBoard(name: string): Promise<boolean> {
        if (!this.campaign) return false;

        this.campaign.loadedBoard = name;
        this.terrain.isBoardDirty = false;
        this.entities.isDirty = false;

        const board: ProtoBoard|null = await boardDB.load(this.campaign.id, name);

        if (!board) return false;  // Erase existing only if the loaded board actually exists.

        await this.loadFromProtoBoard(board);

        broadcast(await this.buildProtoBoard(false), true).catch(console.error);

        this.terrain.isBoardDirty = false;  // May have triggered a "redraw", so reset these flags here.
        this.entities.isDirty = false;

        return true;
    }

    public async loadFromProtoBoard(pb: ProtoBoard) {
        this.terrain.setDirectMap(pb);

        this.entities.getEntityList().forEach(e => this.entities.remove(e.id, false));
        pb.entities.forEach(ent => {
            const sprite = new Sprite(ent.sprite.id, ent.sprite.idx);
            this.entities.addEntity(sprite, {
                ...ent,
                sprite
            }, false)
        });
    }

    public async buildProtoBoard(includeHidden: boolean = true) {
        const tiles = Object.values(this.terrain.getDirectMap()).flat();
        const pb = new ProtoBoard().assign(await packer.packBoard(tiles));

        pb.entities = this.entities.getEntityList().filter(e=>includeHidden||e.visible).map(e => ProtoEntity.fromEntity(e));

        return pb;
    }

    public async saveBoard(): Promise<boolean> {
        if (!this.campaign || !this.campaign.loadedBoard) return false;

        const pb = await this.buildProtoBoard(true);
        await boardDB.save(this.campaign.id, this.campaign.loadedBoard, pb);

        this.terrain.isBoardDirty = false;
        this.entities.isDirty = false;

        await CampaignLoader.saveCampaign(this.campaign);

        return true;
    }
}
