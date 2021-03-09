import Middleware from "./middleware";
import EntityLayer, {Entity} from "../controllers/entities";
import {EVENT_STREAM, GridPoint} from "../renderer/ui-data/ui-event-stream";
import {UiMarker} from "../renderer/ui-components/ui-marker";
import {toggleViewportInput} from "../renderer";
import {DEFAULT_PEN_COLOR, setColor, setSize} from "../renderer/ui-components/ui-tooltip";


export default class EntityMiddleware extends Middleware {
    private ent: Entity|null = null;
    private movePoints: GridPoint[] = [];
    private moveTrackers: UiMarker[] = [];
    private entities: EntityLayer;

    constructor(entities: EntityLayer) {
        super();
        this.entities = entities;
    }

    register(): void {
        setSize(1);
        toggleViewportInput(true);
        this.listener(EVENT_STREAM.on('mouse-up', () => {
            this.clearMovers();
        }));

        this.listener(EVENT_STREAM.on('mouse-down', ev => {
            const trg = this.entities.getEntityList().find(ent => ent.canMove() && ent.x === ev.tx && ent.y === ev.ty);
            if (trg) {
                this.ent = trg;
                this.entities.selected = trg;
                toggleViewportInput(false);
                this.addPoint(ev.tx, ev.ty);
            }
        }));

        this.listener(EVENT_STREAM.on('mouse-up', () => {
            if (this.ent) {
                this.ent = null;
                toggleViewportInput(true);
            }
        }));

        this.listener(EVENT_STREAM.on('hover', ev => {
            if (this.ent) {
                this.entities.updateEntity(this.ent.id, {
                    x: ev.tx,
                    y: ev.ty
                });
                this.addPoint(ev.tx, ev.ty);
            }
            if (this.entities.getEntityList().find(ent => ent.canMove() && ent.x === ev.tx && ent.y === ev.ty)) {
                setColor(0xFF0000);
            } else {
                setColor(DEFAULT_PEN_COLOR);
            }
        }));
    }

    private clearMovers() {
        this.moveTrackers.forEach(mp => mp.remove());
        this.moveTrackers = [];
        this.movePoints = [];
    }

    private addPoint(x: number, y: number) {
        const last = this.movePoints[this.movePoints.length-1];
        if (last && last.tx === x && last.ty === y) return;

        const idx = this.movePoints.findIndex(p => p.tx === x && p.ty === y);
        if (idx >=0) {
            this.movePoints.splice(idx, this.movePoints.length);
            this.moveTrackers.splice(idx, this.moveTrackers.length).forEach(t => t.remove());
        }
        this.movePoints.push({tx: x, ty: y});
        this.moveTrackers.push(new UiMarker((this.pathLength()*5)+'ft').place(x, y));
        this.checkDiag();
    }

    private checkDiag() {
        if (this.movePoints.length < 3) return;
        const last = this.movePoints[this.movePoints.length - 1];
        const third = this.movePoints[this.movePoints.length - 3];
        const dist = EntityMiddleware.distance(third, last);

        if (dist < 2) {
            // Corner we can cut!
            this.movePoints.splice(this.movePoints.length-2, 1);
            this.moveTrackers.splice(this.moveTrackers.length-2, 1).forEach(t => t.remove());
            this.moveTrackers[this.moveTrackers.length-1].setText((this.pathLength()*5) + 'ft');
        }
    }

    private static distance(p1: GridPoint, p2: GridPoint) {
        return Math.sqrt(Math.pow(p1.tx-p2.tx, 2) + Math.pow(p1.ty - p2.ty, 2));
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

    protected onCleanup(): void {
        this.clearMovers();
    }
}
