import pako from "pako";
import {packetList} from "./packets/packet-list";
import ProtoWrapper from "../data/protobufs/proto-wrapper";


export async function workerEncode(packet: any, id: number): Promise<Uint8Array> {
    const clazz = packetList[id];

    if (!clazz) throw Error(`Error encoding packet: Unknown type: "${packet.constructor.name}"!`)

    const data = pako.deflate(clazz.encode(packet).finish(), { level: 9 });

    const combined = new Uint8Array(1 + data.length);
    combined.set([ id ]);
    combined.set(data, 1);

    return combined;
}


export async function workerDecode(data: Uint8Array): Promise<ProtoWrapper> {
    const id = data.slice(0,1)[0];
    const clazz = packetList[id];

    if (!clazz) throw Error(`Error decoding packet: Unknown ID: [${id}]!`);

    return clazz.decode(pako.inflate(data.slice(1)));
}
