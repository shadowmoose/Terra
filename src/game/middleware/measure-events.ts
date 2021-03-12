import Middleware from "./middleware";
import {EVENT_STREAM} from "../renderer/ui-data/ui-event-stream";
import {UiMarker} from "../renderer/ui-components/ui-marker";
import {toggleViewportInput} from "../renderer";
import {DEFAULT_PEN_COLOR, setColor, setSize, setVisible} from "../renderer/ui-components/ui-tooltip";
import {SHAPE_TYPES, UiShape} from "../renderer/ui-components/ui-shape";
import {observable} from "mobx";
import {GRID_TILE_PX} from "../renderer/ui-data/globals";
import EntityLayer from "../controllers/entities";
import MeasureHandler from "../net/handlers/measure-handler";


export default class MeasureMiddleware extends Middleware {
    public measure: UiShape|null = null;
    private counter: UiMarker|null = null;
    private dot: UiShape|null = null;
    private moving = false;
    private px = 0;
    private py = 0;
    @observable public shapeType: SHAPE_TYPES = SHAPE_TYPES.cone;
    @observable public size: number = 0;
    private entities: EntityLayer;
    @observable public sentUpdate = false;

    constructor(entities: EntityLayer) {
        super();
        this.entities = entities;
    }

    register(): void {
        setSize(1);
        toggleViewportInput(false);
        this.setShape(this.shapeType);
        this.listener(EVENT_STREAM.on('mouse-up', () => {
            this.moving = false;
            if (!this.size) {
                if (this.measure && this.sentUpdate) {
                    MeasureHandler.sendMeasure(this.measure, false);
                    this.sentUpdate = false;
                }
                this.counter?.remove();
                this.measure?.remove();
                this.counter = null;
                this.measure = null;
            }
        }));

        this.listener(EVENT_STREAM.on('mouse-down', ev => {
            if (Middleware.isShiftDown) return;
            if (this.measure && this.sentUpdate) {
                MeasureHandler.sendMeasure(this.measure, false);
                this.sentUpdate = false;
            }
            this.size = 0;
            this.measure?.remove();
            this.counter?.remove();
            this.measure = new UiShape(this.shapeType).setPos(ev.tx, ev.ty).size(this.size).thickness(3).setFillColor(0x000000, 0.5);
            this.counter = new UiMarker('0ft').place(ev.tx, ev.ty);
            this.px = ev.tx*GRID_TILE_PX+GRID_TILE_PX/2;
            this.py = ev.ty*GRID_TILE_PX+GRID_TILE_PX/2;
            this.moving = true;

            const ent = this.entities.getEntityList().find(e => e.canMove() && e.x === ev.tx && ev.ty === e.y);
            if (ent) {
                this.measure.color(parseInt(ent.color.replace('#', '0x')));
            }
        }));

        this.listener(EVENT_STREAM.on('pointer-coords', ev => {
            if (!this.moving || Middleware.isShiftDown) return;
            const pxd = Math.sqrt(Math.pow(ev.px-this.px, 2) + Math.pow(ev.py - this.py, 2));
            let td = Math.floor(pxd/GRID_TILE_PX);
            if (this.shapeType === SHAPE_TYPES.rectangle) td *= 2;
            this.size = td;
            this.measure?.size(td);
            this.counter?.setText(td*5+'ft');
            if (this.shapeType === SHAPE_TYPES.cone) this.measure?.pointTowards(ev.px, ev.py);
        }));

        this.listener(EVENT_STREAM.on('hover', (e) => {
            if (!this.moving && this.dot) this.dot?.setPos(e.tx, e.ty);
        }));
    }

    setShape(type: SHAPE_TYPES) {
        this.shapeType = type;
        setVisible(this.shapeType === SHAPE_TYPES.cone);
        if (this.shapeType !== SHAPE_TYPES.cone) {
            this.dot = new UiShape(SHAPE_TYPES.circle).sizePx(5).color(DEFAULT_PEN_COLOR).setFillColor(DEFAULT_PEN_COLOR, 1);
        } else {
            this.dot?.remove();
            this.dot = null;
        }
    }

    protected onCleanup(): void {
        if (this.measure && this.sentUpdate) {
            MeasureHandler.sendMeasure(this.measure, false);
        }
        this.counter?.remove();
        this.measure?.remove();
        this.dot?.remove();
        this.counter = null;
        this.measure = null;
        this.dot = null;
    }

    onShiftPress() {
        toggleViewportInput(true);
        setColor(0x000000);
        this.dot?.color(0x000000);
        this.dot?.setFillColor(0x000000, 1);
    }
    onShiftRelease() {
        toggleViewportInput(false);
        setColor(DEFAULT_PEN_COLOR);
        this.dot?.color(DEFAULT_PEN_COLOR);
        this.dot?.setFillColor(DEFAULT_PEN_COLOR, 1);
    }
}
