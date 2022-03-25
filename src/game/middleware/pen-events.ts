import Middleware from "./middleware";
import Terrain from "../controllers/terrain";
import {observable} from "mobx";
import {EVENT_STREAM, GridPoint} from "../renderer/ui-data/ui-event-stream";
import {DEFAULT_PEN_COLOR, setColor, setSize} from "../renderer/ui-components/ui-tooltip";
import {toggleViewportInput} from "../renderer";

enum PEN_STATE {
    NONE,
    DRAW,
    ERASE
}

export default class PenMiddleware extends Middleware {
    private readonly terrain: Terrain;
    private state: PEN_STATE = PEN_STATE.NONE;
    private readonly canUsePen: boolean;
    @observable public penSize: number = 1;

    constructor(terrain: Terrain, canUsePen: boolean=true) {
        super();
        this.terrain = terrain;
        this.canUsePen = canUsePen;
    }

    register(): void {
        setSize(this.penSize);
        toggleViewportInput(false);

        this.listener(EVENT_STREAM.on('mouse-down', ev => {
            if (Middleware.isShiftDown) return;
            this.state = this.canUsePen ? PEN_STATE.DRAW : PEN_STATE.ERASE;
            this.draw(ev);
        }));

        this.listener(EVENT_STREAM.on('mouse-right-down', ev => {
            if (Middleware.isShiftDown) return;
            this.state = PEN_STATE.ERASE;
            this.draw(ev);
        }));

        this.listener(EVENT_STREAM.on('mouse-middle-down', ev => {
            if (Middleware.isShiftDown) return;
            const sp = this.terrain.getAt(ev.tx, ev.ty);
            if (sp.length) {
                this.terrain.selectedSprite = sp[sp.length-1].sprite;
            }
        }));

        this.listener(EVENT_STREAM.on('mouse-up', () => {
            this.state = PEN_STATE.NONE;
        }));

        this.listener(EVENT_STREAM.on('mouse-right-up', () => {
            this.state = PEN_STATE.NONE;
        }));

        this.listener(EVENT_STREAM.on('hover', ev => {
            if (Middleware.isShiftDown) return;
            this.draw(ev);
        }));

        const wheelCB = (ev: WheelEvent) => {
            if (!ev.target || !(ev.target as HTMLElement).classList.contains("MAIN-GAME-CANVAS")) return true;
            if (!ev.shiftKey) {
                const out = Math.sign(ev.deltaY) * -1;
                this.setPenSize(Math.max(1, Math.min(8, this.penSize += out)));
                return true;
            }
        };
        window.addEventListener('wheel', wheelCB);
        this.listener(() => window.removeEventListener('wheel', wheelCB));
    }

    setPenSize(size: number) {
        this.penSize = Math.max(1, Math.min(8, size));
        setSize(this.penSize);
    }

    draw(ev: GridPoint): boolean {
        if (this.state !== PEN_STATE.NONE) {
            switch (this.state) {
                case PEN_STATE.ERASE:
                    this.box(ev.tx, ev.ty, this.terrain.eraseAt.bind(this.terrain));
                    break;
                case PEN_STATE.DRAW:
                    this.box(ev.tx, ev.ty, this.terrain.drawAt.bind(this.terrain));
            }
            return true;
        }
        return false;
    }

    private box(x: number, y: number, op: Function) {
        for (let xx = x - (this.penSize-1); xx < x + this.penSize; xx++) {
            for (let yy = y - (this.penSize-1); yy < y + this.penSize; yy++) {
                op(xx, yy);
            }
        }
    }

    protected onCleanup(): void {
        toggleViewportInput(true);
    }

    onShiftPress() {
        toggleViewportInput(true);
        setColor(0x000000);
    }
    onShiftRelease() {
        toggleViewportInput(false);
        setColor(DEFAULT_PEN_COLOR)
    }
}
