import Middleware from "./middleware";
import {imageHeightPx, imageWidthPx} from "../consts";
import EntityLayer, {EntityEle} from "../controllers/entities";

interface Point {
    x: number;
    y: number;
}

export default class EntityMiddleware extends Middleware {
    private ent: EntityEle|null = null;
    private readonly container: HTMLElement;
    private moveListener: Function|null = null;
    private movePoints: Point[] = [];
    private moveTrackers: HTMLElement[] = [];
    private entityLayer: EntityLayer;

    constructor(container: HTMLElement, entLayer: EntityLayer) {
        super();
        this.container = container;
        this.entityLayer = entLayer;
    }

    public setTarget(entEle: EntityEle|null) {
        this.ent = entEle;
        this.clearMover();
        if (this.ent) {
            this.entityLayer.toggleInput(false);
            this.ent.bringToFront();
            this.moveListener = this.listen('pointermove', (ev: PointerEvent) => {
                const [x, y] = EntityMiddleware.toGrid(ev);
                this.addPoint(x, y);
                return true;
            }, this.container);
        }
    }

    register(): void {
        this.listen('pointerup', (ev: PointerEvent) => {
            if (this.moveListener) {
                this.entityLayer.toggleInput(true);
                return this.clearMover();
            }
        }, window);
    }

    private clearMover(): boolean {
        this.moveTrackers.forEach(mp => mp.remove());
        this.moveTrackers = [];
        this.movePoints = [];
        if (this.moveListener) {
            this.moveListener();
            this.moveListener = null;
            return true;
        }
        return false;
    }

    private addPoint(x: number, y: number) {
        const last = this.movePoints[this.movePoints.length-1];
        if (last && last.x === x && last.y === y) return;

        const idx = this.movePoints.findIndex(p => p.x === x && p.y === y);
        if (idx >=0) {
            this.movePoints.splice(idx, this.movePoints.length);
        }
        this.movePoints.push({x, y});
        this.checkDiag();
        this.redrawPath();
        if (this.ent) {
            this.entityLayer.updateEntity(this.ent.entity.id,{x, y});
        }
    }

    private checkDiag() {
        if (this.movePoints.length < 3) return;
        const last = this.movePoints[this.movePoints.length - 1];
        const third = this.movePoints[this.movePoints.length - 3];
        const dist = EntityMiddleware.distance(third, last);

        if (dist < 2) {
            // Corner we can cut!
            this.movePoints.splice(this.movePoints.length-2, 1);
        }
    }

    private static distance(p1: Point, p2: Point) {
        return Math.sqrt(Math.pow(p1.x-p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    private pathLength(): number {
        let val = 0;
        this.movePoints.reduce((prev, next) => {
            let dst = EntityMiddleware.distance(prev, next);
            if (dst > 1) dst = 1.5;
            val += dst;
            return next;
        })

        return Math.floor(val);
    }

    private redrawPath() {
        this.moveTrackers.forEach(mp => mp.remove());
        this.moveTrackers = [];

        let id = 0;

        for (const p of this.movePoints) {
            const ele = document.createElement('div');
            ele.className = 'entityMoveTracker';
            Object.assign(ele.style, {
                width: `${imageWidthPx}px`,
                height: `${imageHeightPx}px`,
                left: `${p.x*imageWidthPx}px`,
                top: `${p.y*imageHeightPx}px`
            });
            if (++id === this.movePoints.length) {
                ele.innerText = `${this.pathLength()*5}`;
            }
            this.moveTrackers.push(ele);
            this.container.append(ele);
        }
    }

    private static toGrid(ev: any) {
        const x = Math.floor(ev.offsetX/imageWidthPx);
        const y = Math.floor(ev.offsetY/imageHeightPx);
        return [x, y]
    }

    protected onCleanup(): void {
        this.clearMover();
    }
}
