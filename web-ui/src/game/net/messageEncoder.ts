import * as worker from './messageEncoder.worker';
import { packetList, packetMap } from "./packets/packet-list";


export async function encode(packet: any): Promise<Uint8Array> {
    const id = packetMap[packet.constructor.name];
    const clazz = packetList[id];

    if (!clazz) throw Error(`Error encoding packet: Unknown type: "${packet.constructor.name}"!`)

    return await worker.workerEncode(packet, id)
}


export async function decode(data: Uint8Array): Promise<any> {
    const id = data.slice(0,1)[0];
    const clazz = packetList[id];

    if (!clazz) throw Error(`Error decoding packet: Unknown ID: [${id}], (${data.length})!`);

    return new clazz().assign(await worker.workerDecode(data));
}
