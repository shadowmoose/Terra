import Handler from "./handlers/handler";
import {IObservableValue, observable, ObservableSet} from "mobx";
import notifications from "../../ui-components/notifications";
import * as encoder from './messageEncoder';
import ProtoWrapper from "../data/protobufs/proto-wrapper";
import PromiseStream from "../util/promiseStream";
import {PreCheck} from "./prechecks/precheck";
import {UserData} from "../db/user-db";
import {PingPacket} from "./packets/util-packets";
import {Switchboard, ConnectedPeer} from "switchboard.js";
import {metadata, Meta} from "../db/metadata-db";

export enum NetworkStatus {
    IDLE,
    CONNECTED,
    CONNECTING,
    RECONNECTING,
    DISCONNECTED,
    MATCHMAKING_FAIL,
    WAITING_FOR_HOST
}

export enum NetworkMode {
    UNKNOWN,
    HOST,
    CLIENT,
}

let handlers: Handler[] = [];
let preConn: PreCheck[] = [];

export const clients: ObservableSet<Client> = observable(new Set<Client>());

let sb: Switchboard | null = null;
export let netStatus: IObservableValue<NetworkStatus> = observable.box(NetworkStatus.IDLE);
export let netMode: IObservableValue<NetworkMode> = observable.box(NetworkMode.UNKNOWN);

export function setHandlers(newHandlers: Handler[], newPreConn: PreCheck[]) {
    handlers = newHandlers;
    preConn = newPreConn
}

/**
 * Get the seed that can regenerate the public/private key.
 * If one does not exist already, it is created.
 */
async function getSeed(): Promise<string> {
    let seed = await metadata.get(Meta.CERT_SEED);

    if (!seed) {
        await metadata.store(Meta.CERT_SEED, seed = Switchboard.makeSeed());
    }

    return seed;
}

/**
 * Get the current local peer ID. Generates a new one if it does not already exist.
 * @param useLongform
 */
export async function getMyID(useLongform: boolean = false) {
    if (sb) {
        return useLongform ? sb.fullID : sb.peerID;
    }
    return Switchboard.getIdFromSeed(await getSeed(), useLongform);
}

/**
 * Kill any running SwitchBoard, and start a new one.
 */
export async function makeSB() {
    if (sb) {
        sb.kill(new Error('Closed to launch new Peer connection.'));
    }
    return new Switchboard({
        seed: await getSeed()
    });
}

export async function connectTo(hostID: string): Promise<any> {
    await setMode(NetworkMode.CLIENT);
    if (netStatus.get() !== NetworkStatus.RECONNECTING) netStatus.set(NetworkStatus.CONNECTING);

    sb = await makeSB();

    sb.on('peer', async (peer) => {
        notifications.success('Connected to host!');

        const client = new Client(peer, handlers);
        peer.on('close', () => clientError('host disconnected', client));
        peer.on('error', (err) => console.error(err));

        try {
            netStatus.set(NetworkStatus.WAITING_FOR_HOST);
            for (const pc of preConn) {
                await pc.run(false, client);
                console.debug('Finished pre-check:', pc.constructor.name);
            }
            client.verified = true;
            clients.add(client);
            netStatus.set(NetworkStatus.CONNECTED);
        } catch (err) {
            console.error('failed validation', err);
        }
    });

    sb.on('kill', (err) => {
        console.error(err);
        netStatus.set(NetworkStatus.DISCONNECTED);
    });

    sb.findHost(hostID);
}

export async function clientError(err: any, client: Client): Promise<any> {
    console.warn('Client Error:', err);
    removeClient(client);
    client.close();

    console.log('Reconnecting to host...');
    netStatus.set(NetworkStatus.RECONNECTING);
}

export async function openHost() {
    await setMode(NetworkMode.HOST);

    sb = await makeSB();

    netStatus.set(NetworkStatus.CONNECTED);

    sb.on('peer', async peer => {
        console.warn('Client connected!');
        const cli = new Client(peer, handlers);

        peer.on('close', () => {
            console.debug('Client dropped:', cli);
            removeClient(cli);
        });

        try {
            for (const pc of preConn) {
                await pc.run(true, cli);
                console.debug('Finished pre-check:', pc.constructor.name);
            }
            cli.verified = true;
            clients.add(cli);
            notifications.info(`User "${cli.userData.username}" has joined.`, {preventDuplicate: true});
        } catch (err) {
            console.error(err);
            cli.close();
        }
    });
    sb.on('kill', (err) => {
        console.error(err);
        netStatus.set(NetworkStatus.DISCONNECTED);
    });
    sb.host();
}

export function kill(): void {
    if (sb) {
        clients.forEach(p => {
            p.close();
            removeClient(p);
        });
        netMode.set(NetworkMode.UNKNOWN);
        netStatus.set(NetworkStatus.IDLE);
        sb.kill(undefined, true);
        sb = null;
        console.debug('Killed networking stack.');
    }
}

/**
 * Destroy the connection and set the new mode.
 * @param mode
 */
async function setMode(mode: NetworkMode) {
    kill();
    netMode.set(mode);
}

function removeClient(client: Client) {
    clients.delete(client);
}


export class Client {
    private peer: ConnectedPeer;
    private listener: Function|null = null;
    private readonly handlers: Handler[];
    public verified: boolean = false;
    private lastSend = Promise.resolve();
    private stream = new PromiseStream();
    public userData: UserData = {id: -1, username: 'null', keyCodes:[], lastSeen: 0};
    private readonly pingTimer: any = null;
    public lastPing: number = 0;

    constructor(peer: ConnectedPeer, handlers: Handler[]) {
        this.peer = peer;
        this.handlers = handlers;
        this.hook();

        this.pingTimer = setInterval(() => {
            if (!this.verified) return;
            if (this.peer.isClosed) return this.close();
            if (!this.lastPing) {
                this.lastPing = Date.now();
                return;
            } else if (Date.now() - this.lastPing > 15000) {
                console.warn('Ping timeout.')
                return this.close();
            }
            this.send(new PingPacket()).then();
        }, 10000)
    }

    hook() {
        const self = this;
        this.peer.on('data', (data: any) => {
            self.stream.queue(() => self.handleMessage(data), ()=>this.peer.close())
        });
        this.peer.on('error', (err) => {
            console.error('Client error:', err);
            this.peer.close();
        });
    }

    get id() {
        return this.peer.id;
    }

    async handleMessage(packetBinary: ArrayBuffer) {
        try {
            const packet: ProtoWrapper = await encoder.decode(new Uint8Array(packetBinary));
            if (this.listener) {
                this.listener(packet);
            } else if (!this.verified) {
                // noinspection ExceptionCaughtLocallyJS
                throw Error(`Error: Unexpected packet sent before verification: ${packet}`);
            } else {
                console.debug('Incoming Packet:', packet);
                for (const h of this.handlers) {
                    // @ts-ignore
                    if (h.packets.some(p => packet.$type === p.$type)) {
                        return await h.handlePacket(this, packet);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            this.close();
        }
    }

    close() {
        if (this.listener) {
            // TODO: Add to blacklist on current SwitchBoard.
            this.listener(null);
        }
        if (this.pingTimer) clearTimeout(this.pingTimer);

        this.peer.close();
    }

    /**
     * Sends the given Packet to the client.
     * Utilizes an internal "rolling Promise" to assure that all messages are sent in order.
     * @param packet
     */
    async send(packet: ProtoWrapper) {
        console.debug('Sending client:', packet);
        this.lastSend = this.lastSend.then(async () => {
            this.sendBuffer(await encoder.encode(packet));
        }).catch(err => {
           console.error(`Error sending message to client:`, err);
        });
    }

    sendBuffer(data: Uint8Array) {
        this.peer.send(data);
    }

    /**
     * Wait for the next packet, whatever it may be.
     * Only one listener may be waiting at any given time, or an error will be thrown on subsequent registrations.
     * @param expectedType
     */
    getNextPacket(expectedType: any): Promise<any> {
        if (this.listener) throw Error('Attempted to overwrite client listener!');

        return new Promise((res, rej) => {
            this.listener = (packet: any) => {
                this.listener = null;
                if (!(packet instanceof expectedType)) {
                    return rej(`Unexpected packet type: ${packet} !== ${expectedType}`)
                }
                return res(packet);
            }
        });
    }
}

/**
 * Broadcast the given data to all connected connections.
 * If `requireHost` is true, will only send while we are hosting.
 * @param packet
 * @param requireHost
 */
export async function broadcast(packet: ProtoWrapper, requireHost: boolean) {
    if (requireHost && netMode.get() !== NetworkMode.HOST) {
        return;
    }
    const data = await encoder.encode(packet)

    clients.forEach(c => c.sendBuffer(data));
}

export function isHost() {
    return netMode.get() === NetworkMode.HOST
}
