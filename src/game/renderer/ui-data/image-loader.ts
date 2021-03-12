/*
    PIXI's asset loader sucks a lot, so this is a custom implementation to load and track resources.
 */
import {Loader, Texture} from 'pixi.js';
import {GRID_TILE_PX, TextureKey} from "./globals";
import {EVENT_STREAM} from "./ui-event-stream";

const cache: Record<string, LoadedRes> = {};

interface LoadedRes {
    texture: Promise<Texture>;
    users: number;
}

/**
 * Loads the given texture, and caches it. If one is already loaded or in progress, returns the cached version.
 * Be careful to also release any textures generated in this way.
 *
 * Accepts URLS, or other DOM image sources - such as `createImageBitmap(image, sx, sy, sw, sh)`.
 */
export async function makeTexture(key: TextureKey): Promise<Texture> {
    const {uid} = key;

    if (cache[uid]) {
        cache[uid].users ++;
        return cache[uid].texture;
    }

    const loader = new Loader();

    const prom = new Promise(async (res, rej) => {
        if ("atlas" in key) {
            const can = document.createElement('canvas');
            const ctx = can.getContext('2d')!;
            can.width = key.w;
            can.height = key.h;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(await key.atlas, key.px, key.py, key.w, key.h, 0, 0, key.w, key.h);
            return res(Texture.from(can));
        }
        const resource = await key.source;
        if ((typeof resource).toLowerCase() !== 'string') {
            return res(Texture.from(resource));
        }
        console.log('Loading image resource:', resource);
        loader.add(uid, resource as string);
        loader.onComplete.add(() => {
            // @ts-ignore
            res(loader.resources[uid].texture)
        });
        loader.onError.add((err: any) => {
            rej(err);
        });
        loader.load();
    }).catch(err => {
        console.error(err);
        EVENT_STREAM.emit('texture-fail', { uid, msg: `${err.message}` });
        return makeFailTexture();
    }).then((res: any) => {
        loader.destroy();
        return res;
    }) as Promise<Texture>;

    cache[uid] = {
        texture: prom,
        users: 1
    };

    return prom;
}

/**
 * Attempts to free the given texture. If it is still in use by other Sprites, does nothing. Otherwise, destroys the texture.
 * @param uid
 */
export async function releaseTexture(uid: string) {
    const r = cache[uid];
    if (!r) return;
    r.users -= 1;

    if (!r.users) {
        delete cache[uid];
        const txt = await r.texture;
        Texture.removeFromCache(uid);
        txt.destroy(true);

        console.log("Destroyed texture:", uid);
    }
}


function makeFailTexture() {
    const canv = document.createElement('canvas');
    const ctx = canv.getContext('2d')!;
    canv.width = GRID_TILE_PX;
    canv.height = GRID_TILE_PX;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0,0, GRID_TILE_PX, GRID_TILE_PX);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;

    ctx.moveTo(0, 0);
    ctx.lineTo(GRID_TILE_PX, GRID_TILE_PX);
    ctx.stroke();
    ctx.moveTo(GRID_TILE_PX, 0);
    ctx.lineTo(0, GRID_TILE_PX);
    ctx.stroke();

    return Texture.from(canv);
}


// @ts-ignore
window.debugImageCache = cache;  // Expose cache for debugging.
