import * as particles from 'pixi-particles';
import {EmitterConfig, OldEmitterConfig} from "pixi-particles";
import { Texture } from 'pixi.js';
import {GRID_TILE_PX, OVERLAY_LAYER} from "../ui-data/globals";


export function spawnParticleEmitter(texture: Texture[], config: EmitterConfig|OldEmitterConfig) {
    return new EmitterWrapper(texture, config);
}


class EmitterWrapper {
    private readonly emitter: particles.Emitter;

    constructor(texture: Texture[], config: EmitterConfig|OldEmitterConfig) {
        this.emitter = new particles.Emitter(
            OVERLAY_LAYER,
            texture,
            { ...config, "addAtBack": false }
        );
    }

    public playOnce(destroyAfter = true): Promise<void> {
        return new Promise(res => {
            if (destroyAfter) {
                this.emitter.playOnceAndDestroy(res);
            } else {
                this.emitter.playOnce(res)
            }
        });
    }

    /**
     * Start repeated playback.
     */
    public play() {
        this.emitter.autoUpdate = true;
    }

    public stop(destroyAfter = true) {
        this.emitter.autoUpdate = false;
        if (destroyAfter) this.destroy();
    }

    public destroy() {
        this.emitter.destroy();
    }

    /**
     * Centers this emitter on the given tile coords.
     * @param tx
     * @param ty
     */
    public move(tx: number, ty: number) {
        this.emitter.updateOwnerPos(tx*GRID_TILE_PX + GRID_TILE_PX/2, ty*GRID_TILE_PX + GRID_TILE_PX/2);
        return this;
    }
}
