import {getCerts, setCerts} from "../db/metadata-db";
import {observable} from "mobx";

const keyAlg = 'ECDSA';
const namedCurve = 'P-521'; //can be "P-256", "P-384", or "P-521"
const hashAlg = 'SHA-512';
let privateKey: CryptoKey|null = null;
let publicKey: CryptoKey|null = null;
export const roomID = observable.box<string|null>(null);

function strToBuffer(text: string): ArrayBuffer {
    let buf = new ArrayBuffer(text.length*2); // 2 bytes for each char
    let bufView = new Uint16Array(buf);
    for (let i=0, strLen=text.length; i < strLen; i++) {
        bufView[i] = text.charCodeAt(i);
    }
    return buf
}

function bufferToStr (buffer: ArrayBuffer): string {
    // @ts-ignore
    return String.fromCharCode.apply(null, new Uint16Array(buffer));
}

export async function hash(message: string) {
    const hashBuffer = await crypto.subtle.digest(hashAlg, strToBuffer(message));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a sign/verify key. if they already exist in storage, use them instead.
 */
export async function initKeys(): Promise<void> {
    const { pubKey, privKey } = await getCerts();
    if (!pubKey || !privKey) {
        await regenKeys();
        console.debug('Generated new ID keys.');
    } else {
        publicKey = await hydrate(pubKey, ["verify"]);
        privateKey = await hydrate(privKey, ["sign"]);
        console.debug('Hydrated existing ID keys.');
    }
    await getMyRoomID();
}

export async function regenKeys() {
    const pair = await crypto.subtle.generateKey(
        {
            name: keyAlg,
            namedCurve: namedCurve
        },
        true,
        ["sign", "verify"]
    );
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;

    const { privKey, pubKey } = await exportKeys();

    await setCerts(pubKey, privKey);
    await getMyRoomID();
}

/**
 * Load a CryptoKey object from a JSON token.
 * @param keyJSON
 * @param mode
 */
async function hydrate(keyJSON: string, mode:string [] = ['verify']): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        'jwk',
        JSON.parse(keyJSON),
        {
            name: keyAlg,
            namedCurve: namedCurve
        },
        true,
        mode
    );
}

/**
 * Create a savable object with the JSON-encoded public/private keys, as well as the derived room ID.
 *
 * Because the worst that could possibly happen is an impersonator forces you to use a new ID,
 * this room ID is greatly shortened - and thus technically less cryptographically secure.
 */
export async function exportKeys() {
    if (!privateKey || !publicKey) throw Error('Keys not set!');
    const privKey = JSON.stringify(await crypto.subtle.exportKey('jwk', privateKey));
    const pubKey = JSON.stringify(await crypto.subtle.exportKey('jwk', publicKey));
    const roomID = await hash(pubKey);

    return {
        roomID: roomID.substr(0, 20), // shorten key for URLs.
        privKey,
        pubKey
    }
}

/**
 * Shortcut to get the room ID for the current public key.
 */
export async function getMyRoomID(): Promise<string> {
    const rID = (await exportKeys()).roomID;
    roomID.set(rID);
    return rID;
}

/**
 * Sign the given message text.
 * @param message
 */
export async function sign(message: string): Promise<string> {
    if (!privateKey) throw Error('No key set!');
    const encoded = strToBuffer(message);

    const signature = await window.crypto.subtle.sign(
        {name: keyAlg, hash: {name: hashAlg}},
        privateKey,
        encoded
    );

    return bufferToStr(signature);
}

export async function verify(key: CryptoKey, signature: string, message: string): Promise<boolean> {
    let encoded = strToBuffer(message);

    return await window.crypto.subtle.verify(
        {name: keyAlg, hash: {name: hashAlg}},
        key,
        strToBuffer(signature),
        encoded
    );
}

/**
 * Signs the given object, appends the signature, then JSON-encodes the result.
 * @param {object} ob The object, signed JSON-encoded.
 */
export async function pack(ob: object): Promise<string> {
    const sig = await sign(JSON.stringify(ob));

    return JSON.stringify(
        Object.assign({}, ob, {_sig: sig})
    );
}


/**
 * JSON-decodes the given string, validates the signature for the new object,
 * then returns that object with the signature removed.
 *
 * Validates that the key hashes as expected against the room ID.
 * Raises an Error if the signature does not match.
 *
 * @param roomID
 * @param keyJSON
 * @param {string} objStr The JSON string that contains a signed object.
 */
export async function unpack(roomID: string, keyJSON: string, objStr: string): Promise<any> {
    const hashStr = await hash(keyJSON);

    if (!keyJSON) throw Error('Missing key - cannot be empty.');
    if (roomID.length < 8) throw Error('roomID was empty, cannot set public key.');
    if (hashStr.indexOf(roomID) !== 0) throw Error('The given key is not valid for this room! Impostor host?');

    const key = await hydrate(keyJSON);

    const ob = JSON.parse(objStr);
    const sig = ob._sig;

    delete ob._sig;

    if (! await verify(key, sig, JSON.stringify(ob))) {
        throw Error('Invalid signature for object!')
    }

    return ob;
}
