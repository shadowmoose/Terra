import {Text, TextStyle} from 'pixi.js'
import * as util from '../ui-data/ui-util';
import {OVERLAY_DEPTHS, OVERLAY_LAYER} from "../ui-data/globals";

const defaultStyle = {
    fontFamily: "Helvetica",
    fontSize: 24,
    fill: "#000000",
    stroke: '#FFFFFF',
    strokeThickness: 3,
};

const plates = new Set<UiNamePlate>();

/**
 * Replace all plates, and shift them all to not overlap.
 */
export function shiftPlates() {
    plates.forEach(plate => {
        plate.position.set(plate.dx, plate.dy);
        plates.forEach(p => {
            if (p === plate) return;
            while (util.collides(plate, p)) {
                plate.position.set(plate.x, plate.y -= (plate.height+1));
            }
        });
    })
}

export class UiNamePlate extends Text{
    public dx = 0;
    public dy = 0;
    private added = false;

    constructor(text: string) {
        super(text, new TextStyle(defaultStyle));
        this.resolution = 8;
        this.zIndex = OVERLAY_DEPTHS.NAMEPLATE;
    }

    public setColor(color: string) {
        console.log('plat color:', color)
        this.style.fill = color;
    }

    public setName(name: string) {
        this.text = name;
    }

    /**
     * Place this plate near the given coords, sliding up to make space for preexisting plates.
     * @param x
     * @param y
     */
    public place (x: number, y: number) {
        if (!this.added) {
            this.added = true;
            OVERLAY_LAYER.addChild(this);
            plates.add(this);
        }
        this.dx = x - this.width/3;
        this.dy = y - this.height;
        shiftPlates();
    }

    /**
     * Delete this plate, cleaning up any positioning problems.
     */
    remove() {
        plates.delete(this);
        this.destroy({
            children: true,
            texture: true,
            baseTexture: true
        });

        shiftPlates();
    }
}
