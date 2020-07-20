import Peer, {DataConnection} from 'peerjs';
import {getMyRoomID} from './crypter'
import Handler from "./handlers/handler";
import {IObservableValue, observable, ObservableSet} from "mobx";
import notifications from "../../ui-components/notifications";
import * as encoder from './messageEncoder';
import ProtoWrapper from "../data/protobufs/proto-wrapper";
import PromiseStream from "../util/promiseStream";
import {PreCheck} from "./prechecks/precheck";
import {UserData} from "../db/user-db";
import {PingPacket} from "./packets/util-packets";

export enum NetworkStatus {
    IDLE,
    CONNECTED,
    CONNECTING,
    RECONNECTING,
    DISCONNECTED,
    MATCHMAKING,
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

let _peer: Peer | null = null;
export let roomID: IObservableValue<string> = observable.box('');
export let netStatus: IObservableValue<NetworkStatus> = observable.box(NetworkStatus.IDLE);
export let netMode: IObservableValue<NetworkMode> = observable.box(NetworkMode.UNKNOWN);

export function setHandlers(newHandlers: Handler[], newPreConn: PreCheck[]) {
    handlers = newHandlers;
    preConn = newPreConn
}

export async function peer(makeNew: boolean = false): Promise<Peer> {
    if (_peer){
        if (makeNew) {
            _peer.destroy()
            _peer = null;
        } else {
            return _peer;
        }
    }

    roomID.set(await getMyRoomID());

    netStatus.set(NetworkStatus.MATCHMAKING);

    _peer = new Peer(roomID.get(), {
        host: 'peerjs.rofl.wtf', // Relative path assumes current hostname.
        port: 443,
        path: '/',
        key: 'gaia-password',
        secure: true
    });

    await new Promise((res, rej) => {
        // Wait for the peer server connection to be ready.
        // @ts-ignore
        _peer.on('open', res);
        // @ts-ignore
        _peer.on('error', (err: any) => {
            console.error(`PeerJS Error:`, err);
            notifications.error(`PeerJS Error: ${err.message}`, {preventDuplicate: true, autoHideDuration: 10000})
            netStatus.set(NetworkStatus.MATCHMAKING_FAIL);
            rej(err);
        });
    });

    return _peer;
}

export async function connectTo(roomID: string): Promise<any> {
    await setMode(NetworkMode.CLIENT);
    if (netStatus.get() !== NetworkStatus.RECONNECTING) netStatus.set(NetworkStatus.CONNECTING);
    const p = await peer(true);

    let conn: DataConnection;
    let client: Client;

    conn = p.connect(roomID, {
        reliable: true
    });
    client = new Client(conn, handlers, roomID);
    client.shouldReconnect = true;

    conn.on('close', () => clientError('host disconnected', client));
    conn.on('error', (err: any) => clientError(err, client));
    conn.on('open', () => {
        notifications.success('Connected to host!');
        console.log('CONNECTED TO HOST!');
    });

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
        client.shouldReconnect = false;
        await clientError(err, client)
    }
}

export async function clientError(err: any, client: Client): Promise<any> {
    console.warn('Client Error:', err, client.shouldReconnect);
    removeClient(client);
    client.close();

    netStatus.set(NetworkStatus.DISCONNECTED);

    if (client.shouldReconnect) {
        console.log('Reconnecting...');
        netStatus.set(NetworkStatus.RECONNECTING);
        return connectTo(client.roomID)
    }
}

export async function openHost() {
    await setMode(NetworkMode.HOST);

    const server = await peer(true);

    netStatus.set(NetworkStatus.CONNECTED);

    server.on('connection', (conn: DataConnection) => {
        let cli: Client|null = null;
        console.warn('Client connected!')
        conn.on('open', async () => {
            cli = new Client(conn, handlers, roomID.get());
            try{
                for (const pc of preConn) {
                    await pc.run(true, cli);
                    console.debug('Finished pre-check:', pc.constructor.name);
                }
                cli.verified = true;
                clients.add(cli);
            } catch (err) {
                console.error(err);
                cli.close();
            }
        });
        conn.on('close', () => {
            if (cli) {
                console.debug('Client dropped:', cli);
                removeClient(cli);
            }
        });
    });
}

export async function kill(): Promise<void> {
    if (_peer) {
        clients.forEach(p => {
            p.close();
            removeClient(p);
        });
        netMode.set(NetworkMode.UNKNOWN);
        netStatus.set(NetworkStatus.IDLE);
        await _peer.destroy();
        _peer = null;
    }
}

/**
 * Destroy the connection and set the new mode.
 * @param mode
 */
async function setMode(mode: NetworkMode) {
    await kill();
    netMode.set(mode);
}

function removeClient(client: Client) {
    clients.delete(client);
}


export class Client {
    private conn: DataConnection;
    private listener: Function|null = null;
    public readonly roomID: string;
    private readonly handlers: Handler[];
    public verified: boolean = false;
    public shouldReconnect: boolean = false;
    private lastSend = Promise.resolve();
    private stream = new PromiseStream();
    public userData: UserData = {id: -1, username: 'null', keyCodes:[], lastSeen: 0};
    private readonly pingTimer: any = null;
    public lastPing: number = 0;

    constructor(conn: DataConnection, handlers: Handler[], roomID: string) {
        this.conn = conn;
        this.roomID = roomID;
        this.handlers = handlers;
        this.hook();

        this.pingTimer = setInterval(() => {
            if (!this.verified) return;
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
        this.conn.on('data', data => {
            self.stream.queue(() => self.handleMessage(data), ()=>this.conn.close())
        });
        this.conn.on('error', (err) => {
            console.error('Client error:', err);
            this.conn.close();
        });
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
            this.shouldReconnect = false;
            this.close();
        }
    }

    close() {
        if (this.listener) {
            this.shouldReconnect = false;
            this.listener(null);
        }
        if (this.pingTimer) clearTimeout(this.pingTimer);

        this.conn.close();
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
        this.conn.send(data);
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
export function broadcast(packet: ProtoWrapper, requireHost: boolean) {
    if (requireHost && netMode.get() !== NetworkMode.HOST) {
        return;
    }
    encoder.encode(packet).then(data => {
        clients.forEach(c => c.sendBuffer(data));
    });
}

export function isHost() {
    return netMode.get() === NetworkMode.HOST
}
