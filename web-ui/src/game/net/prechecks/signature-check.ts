import {Client} from "../peerconnection";
import {exportKeys, pack, unpack} from "../crypter";
import {PreCheck} from "./precheck";
import {addNewUser, checkUserCredentials, getUser, updateUser} from "../../db/user-db";
import * as metadata from '../../db/metadata-db';
import {ReadyPacket, SignaturePacket} from "../packets/util-packets";


export default class HandShakeCheck extends PreCheck {
    /**
     * Accepts a signed JSON packet, and validates the signature.
     * The validation is an async race condition, so responds with an OK packet once finished.
     * @param client
     */
    async client(client: Client): Promise<void> {
        const data: SignaturePacket = await client.getNextPacket(SignaturePacket);
        const pk = JSON.parse(data.signedJSON)?.pubKey;
        const ob = await unpack(client.roomID, pk, data.signedJSON);

        if (ob.pubKey && ob.pubKey === pk) {
            console.debug('Validated host ID.');

            // Respond with client's own signed auth packet.
            const { pubKey, roomID } = await exportKeys();
            const username = await metadata.getUsername();
            const packet = new SignaturePacket().assign({
                signedJSON: await pack({
                    pubKey,
                    username,
                    roomID
                })
            });
            await client.send(packet);

            await client.getNextPacket(ReadyPacket); // Wait for host to allow out login.
        }
    }

    /**
     * Sends a signed JSON packet, to validate this host ID.
     * Awaits an OK Packet from the client, once validation is complete.
     * @param client
     */
    async host(client: Client): Promise<void> {
        // Send a signed message to verify we're the real host:
        const packet = new SignaturePacket().assign({
            signedJSON: await pack({
                pubKey: (await exportKeys()).pubKey
            })
        });
        await client.send(packet);

        // Wait for client to respond with signed message containing username:
        const data: SignaturePacket = await client.getNextPacket(SignaturePacket);
        const raw = JSON.parse(data.signedJSON);
        const ob = await unpack(raw.roomID, raw.pubKey, data.signedJSON);
        const {username, roomID} = ob;

        let user = await checkUserCredentials(username, roomID);
        if (!user) {
            let existing = await getUser(username);

            await this.controller.lobby.addPendingLogin(username, roomID);  // Will be approved via UI, by the Host.

            if (!existing) {
                console.log(`Added new user: ${username}, ${roomID}`);
                existing = await addNewUser({username, keyCodes: [roomID]});
            } else {
                console.log(`Updated existing user: ${username}, ${roomID}`);
                existing.keyCodes.push(roomID);
                await updateUser(existing);
            }
            user = existing;
        }

        client.userData = user;
        await client.send(new ReadyPacket())
    }
}

