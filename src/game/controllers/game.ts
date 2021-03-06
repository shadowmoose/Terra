import {Sprite, waitForSpriteLoad} from "../util/sprite-loading";
import Terrain from "./terrain";
import {observable} from "mobx";
import * as connection from '../net/peerconnection'
import {broadcast, NetworkStatus, getMyID} from "../net/peerconnection";
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
import MediaSyncHandler from "../net/handlers/media-sync-handler";
import MediaSync from "../net/prechecks/media-sync";
import {ProtoSprite} from "../data/protobufs/proto-sprite";
import * as RENDER from '../renderer';
import MeasureHandler from "../net/handlers/measure-handler";

export default class GameController {
    public terrain: Terrain;
    public entities: EntityLayer;
    @observable public ready: boolean = false;
    private readonly preChecks: PreCheck[];
    private readonly handlers: Handler[];
    public readonly lobby: Lobby;
    @observable public campaign: Campaign|null = null;

    constructor() {
        this.terrain = new Terrain();
        this.entities = new EntityLayer();
        this.lobby = new Lobby();

        // Initialize networking stuff:
        this.preChecks = [
            new HandShakeCheck(this),
            new BoardSync(this),
            new MediaSync(this)
        ];
        this.handlers = [
            new TerrainAddHandler(this.terrain),
            new TerrainEraseHandler(this.terrain),
            new EntityUpdateHandler(this.entities),
            new PingHandler(),
            new BoardReloadHandler(this),
            new MediaSyncHandler(this),
            new MeasureHandler(this)
        ];
    }

    /**
     * Starts the main game client, waiting for the Sprite Loader to become ready.
     * Also initializes any required keys or other async setup.
     * Automatically starts the Client/Host connection if a URL Hash has been set already.
     */
    public async start() {
        console.debug('Main game controller started.');

        await waitForSpriteLoad;

        RENDER.toggleViewportInput(true);

        console.log('Local Room ID Key:', await getMyID());

        const hash = window.location.hash.replace('#', '');
        if (hash) {
            if ((await getMyID()) === hash) {
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
        window.addEventListener("beforeunload", () => {
            connection.kill();
            this.ready = false;
        })
    }

    public async startHost(): Promise<void> {
        connection.kill();
        this.lobby.pendingLogins.forEach(pu => this.lobby.rejectUser(pu));

        console.log('Hosting lobby at:', await getMyID());
        window.location.hash = await getMyID();

        this.handlers.forEach(h => h.setHost(true));
        connection.setHandlers(this.handlers, this.preChecks);

        await connection.openHost();
    }

    public async startClient(connectID: string) {
        connection.kill();
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
        await waitForSpriteLoad;

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

        pb.entities = this.entities.getEntityList().filter(e=>includeHidden||e.visible).map(e => {
            const sprite = new ProtoSprite().assign({id: e.sprite.id, idx: e.sprite.idx})
            return new ProtoEntity().assign({
                ...e,
                sprite,
                owners: Array.from(e.owners)
            });
        });

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

    public async deleteBoard(campaign: Campaign, name: string): Promise<boolean> {
        const idx = campaign.boards.indexOf(name);

        if (idx < 0) {
            return false;
        }

        campaign.boards.splice(idx, 1);

        if (campaign.loadedBoard === name) {
            campaign.loadedBoard = null;
        }

        await boardDB.deleteBoard(campaign.id, name);
        await CampaignLoader.saveCampaign(campaign);

        return true;
    }
}
