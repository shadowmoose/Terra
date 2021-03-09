import { Graphics } from "pixi.js";
import {GRID_TILE_PX, OVERLAY_DEPTHS, OVERLAY_LAYER} from "../ui-data/globals";

export enum SHAPE_TYPES {
    circle,
    rectangle,
    cone
}


export class UiShape {
    private readonly gr: Graphics;
    private _type: SHAPE_TYPES;
    private _thickness: number = 1;
    private _color: number = 0x000000;
    private _fill: number = -1;
    private _alpha: number = 1;
    private _width: number = 0;
    private _height: number = 0;
    private tx: number = 0;
    private ty: number = 0;
    private added = false;

    constructor(type: SHAPE_TYPES) {
        this._type = type;
        this.gr = new Graphics();
        this.gr.zIndex = OVERLAY_DEPTHS.SHAPES;
    }

    type(type: SHAPE_TYPES) {
        this._type = type;
        this.redraw();
        return this;
    }

    /**
     * Set the size of this object.
     * If ignored, height matches width. Height currently only applies to rectangles.
     * @param widthTiles
     * @param heightTiles
     */
    size(widthTiles: number, heightTiles = -1) {
        this._width = widthTiles * GRID_TILE_PX;
        this._height = (heightTiles > -1 ? heightTiles : widthTiles) * GRID_TILE_PX;
        this.redraw();
        return this;
    }

    color(col: number) {
        if (this._color !== col) {
            this._color = col;
            this.redraw();
        }
        this.redraw();
        return this;
    }

    setFillColor(col: number, alpha: number = 0.5) {
        this._fill = col;
        this._alpha = alpha;
        this.redraw();
        return this;
    }

    thickness(thickness: number) {
        if (this._thickness !== thickness) {
            this._thickness = thickness;
            this.redraw();
        }
        return this;
    }

    private redraw() {
        this.gr.clear();
        this.gr.lineStyle(this._thickness, this._color);
        if (this._fill >= 0) {
            this.gr.beginFill(this._fill, this._alpha);
            this.draw();
            this.gr.endFill();
        }
        this.gr.lineStyle(this._thickness, this._color);
        this.draw();
        return this;
    }

    private draw() {
        if (!this._width) return;
        switch (this._type) {
            case SHAPE_TYPES.circle:
                this.gr.drawCircle(this._width, this._width, this._width);
                this.gr.pivot.x = this.gr.width/2;
                this.gr.pivot.y = this.gr.height/2;
                break
            case SHAPE_TYPES.rectangle:
                this.gr.drawRect(0, 0, this._width, this._height);
                this.gr.pivot.x = this.gr.width/2;
                this.gr.pivot.y = this.gr.height/2;
                break;
            case SHAPE_TYPES.cone:
                this.gr.drawPolygon([
                    0, this._width/2,
                    this._width, 0,
                    this._width, this._width,
                    0, this._width/2
                ]);
                this.gr.pivot.x = 0;
                this.gr.pivot.y = this._width/2;
                break;
        }
        // this.gr.drawCircle(this.gr.pivot.x, this.gr.pivot.y, 1);
    }

    setPos(tx: number, ty: number) {
        this.tx = tx;
        this.ty = ty;
        if (!this.added) {
            this.added = true;
            OVERLAY_LAYER.addChild(this.gr);
        }
        this.gr.position.set(this.tx * GRID_TILE_PX ,this.ty * GRID_TILE_PX);
        return this;
    }

    private slideCone(px: number, py: number) {
        let nx = this.tx * GRID_TILE_PX;
        let ny = this.ty * GRID_TILE_PX;
        let xd = Math.min(GRID_TILE_PX, Math.max(0, px - nx));
        let yd = Math.min(GRID_TILE_PX, Math.max(0, py - ny));

        this.gr.position.set(nx+xd, ny+yd);
    }

    setRotation(radians: number) {
        this.gr.rotation = radians;
    }

    /** Current rotation, in radians. */
    get rotation () {
        return this.gr.rotation;
    }

    /** Current real-world position of this shape, in Pixels. */
    get position () {
        return {
            px: this.gr.position.x,
            py: this.gr.position.y,
        };
    }

    /**
     * Angle the shape to point towards some real-world pixel coordinates.
     * If this shape is a cone, repositions the origin to start from the nearest border point of the tile.
     * @param px
     * @param py
     * @param snap Optionally round off the angle
     * @param snapRads Resolution to round off, is enabled. Defaults to 10deg increments.
     */
    pointTowards(px: number, py: number, snap = false, snapRads = 0.174533) {
        if (this._type === SHAPE_TYPES.cone) this.slideCone(px, py);

        let rad = Math.atan2(py - this.gr.position.y, px - this.gr.position.x);
        if (snap) {
            rad = Math.floor(rad/snapRads) * snapRads;
        }
        this.setRotation(rad);
        return this;
    }

    destroy() {
        OVERLAY_LAYER.removeChild(this.gr);
        this.gr.destroy({
            children: true,
            texture: true
        });
    }
}
