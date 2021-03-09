import {Graphics, ITextStyle, Text} from "pixi.js";
import {GRID_TILE_PX, OVERLAY_DEPTHS, OVERLAY_LAYER} from "../ui-data/globals";

const defaultStyle: Partial<ITextStyle> = {
    fontFamily: "Helvetica",
    fontSize: 14,
    fill: "white",
};

/** A small 1x1 tile token, which contains text. */
export class UiMarker {
    private readonly background: number;
    private readonly alpha: number;
    private readonly gr = new Graphics();
    private readonly txt: Text;
    private readonly border: number;
    private added = false;
    private tx = 0;
    private ty = 0;

    constructor(text: string, textOpts: Partial<ITextStyle> = {}, background = 0x000000, bgAlpha = 0.5, border=3) {
        this.background = background;
        this.alpha = bgAlpha;
        this.txt = new Text(text, {...defaultStyle, ...textOpts});
        this.border = border;
        this.gr.zIndex = OVERLAY_DEPTHS.MARKER_BKG;
        this.txt.zIndex = OVERLAY_DEPTHS.MARKER_TXT;
        this.txt.resolution = 8;
    }

    private draw() {
        this.gr.beginFill(this.background, this.alpha);
        this.gr.drawRect(0, 0, GRID_TILE_PX, GRID_TILE_PX);
        this.gr.endFill();
        this.gr.lineStyle(4, this.background);
        if (this.border > -1) {
            this.gr.drawRect(0, 0, GRID_TILE_PX, GRID_TILE_PX);
        }
    }

    place (tx: number, ty: number) {
        if (!this.added) {
            this.added = true;
            this.draw();
            OVERLAY_LAYER.addChild(this.gr, this.txt);
        }
        this.tx = tx;
        this.ty = ty;
        this.updatePosition();
        return this;
    }

    private updatePosition() {
        const px = this.tx*GRID_TILE_PX, py = this.ty*GRID_TILE_PX;
        this.gr.position.set(px, py);
        this.txt.position.set(px + GRID_TILE_PX/2 - this.txt.width/2, py + GRID_TILE_PX/2 - this.txt.height/2);
    }

    setText(text: string) {
        this.txt.text = text;
        this.updatePosition();
        return this;
    }

    remove() {
        OVERLAY_LAYER.removeChild(this.gr, this.txt);
        this.gr.destroy({
            children: true,
            texture: true,
            baseTexture: true
        });
        this.txt.destroy({
            children: true,
            texture: true,
            baseTexture: true
        });
    }
}
