import {Graphics, Text, TextStyle} from 'pixi.js'
import * as util from '../ui-data/ui-util';
import {OVERLAY_DEPTHS, OVERLAY_LAYER} from "../ui-data/globals";

const defaultStyle = {
    fontFamily: "Arial Black",
    fontSize: 18,
    fill: "#000000"
};

const plates = new Set<UiNamePlate>();

/**
 * Replace all plates, and shift them all to not overlap.
 */
export function shiftPlates() {
    Array.from(plates).sort((p1, p2) => p1.dy - p2.dy).forEach(plate => {
        plate.position.set(plate.dx, plate.dy);
        plates.forEach(p => {
            if (p === plate) return;
            while (util.collides(plate, p)) {
                plate.position.set(plate.dx, plate.y -= (plate.height+2));
            }
        });
        plate.moveBkg();
    })
}

export class UiNamePlate extends Text{
    public dx = 0;
    public dy = 0;
    private added = false;
    private bkg = new Graphics();

    constructor(text: string) {
        super(text, new TextStyle(defaultStyle));
        this.resolution = 8;
        this.zIndex = OVERLAY_DEPTHS.NAMEPLATE;
        this.roundPixels = true;
    }

    public setColor(color: string) {
        if (this.style) this.style.fill = color;
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
            OVERLAY_LAYER.addChild(this.bkg);
            plates.add(this);
        }
        this.calculateBounds();
        this.dx = Math.round(x - this.width/2);
        this.dy = Math.round(y - this.height);
        shiftPlates();
    }

    public moveBkg() {
        this.bkg.clear();
        this.bkg.beginFill(0xFFFFFF, 0.5);
        this.bkg.drawRect(0,0,this.width+4, this.height+4);
        this.bkg.endFill();
        this.bkg.position.set(this.position.x-2, this.position.y-2);
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
        this.bkg.destroy({
            texture: true,
            baseTexture: true,
            children: true
        })

        shiftPlates();
    }
}
