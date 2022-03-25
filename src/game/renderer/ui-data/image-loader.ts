/*
    PIXI's asset loader sucks a lot, so this is a custom implementation to load and track resources.
 */
import {Loader, Texture} from 'pixi.js';
import { parseGIF, decompressFrames } from 'gifuct-js'
import {GRID_TILE_PX, TextureKey} from "./globals";
import {EVENT_STREAM} from "./ui-event-stream";

const cache: Record<string, LoadedRes> = {};
const gifCache: Record<string, Promise<LoadedGif>> = {};

interface LoadedRes {
    texture: Promise<Texture>;
    users: number;
}

interface LoadedGif {
    users: number;
    frames: TextureKey[];
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

export async function releaseGif(gifURI: string) {
    const loaded = await gifCache[gifURI];
    if (!loaded) return;
    loaded.users--;
    if (!loaded.users) {
        delete gifCache[gifURI];
        console.log("Destroyed GIF:", gifURI);
    }
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
        Texture.removeFromCache(txt);
        txt.destroy(true);

        console.log("Destroyed texture:", uid);
    }
}


function makeFailImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = GRID_TILE_PX;
    canvas.height = GRID_TILE_PX;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, GRID_TILE_PX, GRID_TILE_PX);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;

    ctx.moveTo(0, 0);
    ctx.lineTo(GRID_TILE_PX, GRID_TILE_PX);
    ctx.stroke();
    ctx.moveTo(GRID_TILE_PX, 0);
    ctx.lineTo(0, GRID_TILE_PX);
    ctx.stroke();
    return canvas;
}

function makeFailTexture() {
    return Texture.from(makeFailImage());
}

/**
 * Resize the given canvas to fit the current grid tile dimensions.
 */
function resizeCanvas(input: HTMLCanvasElement) {
    const can2 = document.createElement('canvas');
    const ctx2 = can2.getContext('2d')!;
    can2.width = GRID_TILE_PX;
    can2.height = GRID_TILE_PX;
    ctx2.imageSmoothingEnabled = false;
    ctx2.globalAlpha = 1;
    ctx2.drawImage(input, 0, 0, input.width, input.height, 0, 0, GRID_TILE_PX, GRID_TILE_PX);
    return can2;
}

export async function loadFramesFromGif(gifURI: string): Promise<LoadedGif> {
    if (!gifURI.startsWith("gif:")) throw Error("Invalid GIF URI: " + gifURI);

    if (!gifCache[gifURI]) {
        gifCache[gifURI] = new Promise(async resolve => {
            const res: LoadedGif = {frames: [], users: 0};
            try {
                const gif = await fetch(gifURI.replace(/^gif:/, ""))
                    .then(resp => resp.arrayBuffer())
                    .then(buff => parseGIF(buff))
                    .then(gif => decompressFrames(gif, true));

                const can = document.createElement('canvas');
                const ctx = can.getContext('2d')!;
                let iDat: ImageData|null = null;

                ctx.imageSmoothingEnabled = false;
                ctx.globalAlpha = 1;

                gif.forEach((frame, idx) => {
                    if (iDat == null || frame.dims.width !== iDat.width || frame.dims.height !== iDat.height) {
                        can.width = frame.dims.width;
                        can.height = frame.dims.height;
                        iDat = ctx.createImageData(frame.dims.width, frame.dims.height);
                    }
                    if (frame.disposalType === 2) {
                        ctx.clearRect(0,0, can.width, can.height);
                    }
                    iDat.data.set(frame.patch);
                    ctx.putImageData(iDat, 0, 0);

                    res.frames.push({
                        uid: gifURI+":"+idx,
                        source: resizeCanvas(can),
                        delay: frame.delay
                    });
                });
            } catch (err) {
                console.error(err);
                res.frames.push({
                    uid: gifURI+":failed",
                    source: makeFailImage()
                });
            }
            if (!res.frames.length) {
                res.frames.push({
                    uid: gifURI+":failed",
                    source: makeFailImage()
                });
            }
            resolve(res);
        });
    }

    const cached = await gifCache[gifURI];
    cached.users += 1;

    return cached;
}


// @ts-ignore
window.debugImageCache = cache;  // Expose cache for debugging.
