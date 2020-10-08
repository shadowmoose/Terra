import {Client} from "../peerconnection";
import {PreCheck} from "./precheck";
import {addNewUser, checkUserCredentials, getUser, updateUser} from "../../db/user-db";
import {Meta, metadata} from '../../db/metadata-db';
import {ReadyPacket, SignaturePacket} from "../packets/util-packets";


export default class HandShakeCheck extends PreCheck {
    /**
     * Accepts a signed JSON packet, and validates the signature.
     * The validation is an async race condition, so responds with an OK packet once finished.
     * @param client
     */
    async client(client: Client): Promise<void> {
        const username = await metadata.get(Meta.USERNAME);
        const packet = new SignaturePacket().assign({
            username
        });
        await client.send(packet);

        await client.getNextPacket(ReadyPacket); // Wait for host to allow out login.
    }

    /**
     * Sends a signed JSON packet, to validate this host ID.
     * Awaits an OK Packet from the client, once validation is complete.
     * @param client
     */
    async host(client: Client): Promise<void> {
        // Wait for client to send a message containing username:
        const data: SignaturePacket = await client.getNextPacket(SignaturePacket);
        const {username} = data;

        let user = await checkUserCredentials(username, client.id);
        if (!user) {
            let existing = await getUser(username);

            await this.controller.lobby.addPendingLogin(username, client.id);  // Will be approved via UI, by the Host.

            if (!existing) {
                console.log(`Added new user: ${username}, ${client.id}`);
                existing = await addNewUser({username, keyCodes: [client.id]});
            } else {
                console.log(`Updated existing user: ${username}, ${client.id}`);
                existing.keyCodes.push(client.id);
                await updateUser(existing);
            }
            user = existing;
        }

        client.userData = user;
        await client.send(new ReadyPacket())
    }
}

