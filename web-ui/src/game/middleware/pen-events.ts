import Middleware from "./middleware";
import Terrain from "../controllers/terrain";
import {imageHeightPx, imageWidthPx} from "../consts";
import {observable} from "mobx";
import {CanvasContainer} from "../controllers/canvas";
import EntityLayer from "../controllers/entities";

export default class PenMiddleware extends Middleware {
    private readonly terrain: Terrain;
    private state: number = -1;
    private readonly canUsePen: boolean;
    @observable public penSize: number = 1;
    private container: CanvasContainer;
    private readonly hoverBox: HTMLElement;
    private readonly entities: EntityLayer;
    private toggle: boolean = false;

    constructor(terrain: Terrain, entities: EntityLayer, container: CanvasContainer, canUsePen: boolean=true) {
        super();
        this.terrain = terrain;
        this.entities = entities;
        this.container = container;
        this.canUsePen = canUsePen;
        this.hoverBox = document.createElement('div');
    }

    register(): void {
        this.container.addElement(this.hoverBox);
        this.entities.toggleInput(false, false);

        this.listen('keydown', (ke: KeyboardEvent) => {
            if (ke.code.startsWith('Shift') && !this.toggle) {
                this.toggle = true;
                this.entities.toggleInput(true);
                this.hoverBox.remove();
            }
        }, document.body);

        this.listen('keyup', (ke: KeyboardEvent) => {
            if (ke.code.startsWith('Shift')) {
                this.toggle = false;
                this.entities.toggleInput(false, false);
                this.container.addElement(this.hoverBox);
            }
        }, window);

        this.listen('mousemove', (ev: MouseEvent) => {
            this.updateHighlight(ev);
        });

        this.listen('pointerdown', (ev: PointerEvent) => {
            if (ev.shiftKey) {
                return;
            }
            if (ev.button === 1) {
                // Middle mouse "dropper":
                const [xx, yy] = PenMiddleware.toGrid(ev);
                const sp = this.terrain.getAt(xx, yy);
                if (sp.length) {
                    this.terrain.selectedSprite = sp[sp.length-1].sprite;
                    return true;
                }
            }
            this.state = ev.button;
            return this.draw(ev);
        });

        this.listen('pointerup', (ev: PointerEvent) => {
            if (this.state >= 0) {
                ev.preventDefault();
                ev.stopPropagation();
                this.state = -1;
            }
        }, window);

        this.listen('pointermove', (ev: PointerEvent) => {
            return this.draw(ev);
        });

        this.listen('wheel', (ev: WheelEvent) => {
            if (!ev.shiftKey) {
                const out = Math.sign(ev.deltaY) * -1;
                this.penSize = Math.max(1, Math.min(8, this.penSize += out));
                this.updateHighlight(ev);
                return true;
            }
        });
    }

    draw(ev: PointerEvent): boolean {
        if (this.state >= 0) {
            const [xx, yy] = PenMiddleware.toGrid(ev);
            this.updateHighlight(ev);

            switch (this.state) {
                case 2:
                    this.box(xx, yy, this.terrain.eraseAt.bind(this.terrain));
                    break;
                case 0:
                    if (this.canUsePen) this.box(xx, yy, this.terrain.drawAt.bind(this.terrain));
                    else if (!this.canUsePen) this.box(xx, yy, this.terrain.eraseAt.bind(this.terrain));
            }
            return true;
        }
        return false;
    }

    updateHighlight(ev: Event) {
        const [x, y] = PenMiddleware.toGrid(ev);
        Object.assign(this.hoverBox.style,{
            border: '3px solid orangered',
            left: `${x*imageWidthPx - (this.penSize-1) * imageWidthPx}px`,
            top: `${y*imageHeightPx - (this.penSize-1) * imageHeightPx}px`,
            width: `${(this.penSize*2-1) * imageWidthPx - 3}px`,
            height: `${(this.penSize*2-1) * imageHeightPx - 3}px`,
            position: 'absolute',
            'pointer-events': 'none',
            'z-index': 1
        });
    }

    private static toGrid(ev: any) {
        const x = Math.floor(ev.offsetX/imageWidthPx);
        const y = Math.floor(ev.offsetY/imageHeightPx);
        return [x, y]
    }

    private box(x: number, y: number, op: Function) {
        for (let xx = x - (this.penSize-1); xx < x + this.penSize; xx++) {
            for (let yy = y - (this.penSize-1); yy < y + this.penSize; yy++) {
                op(xx, yy);
            }
        }
    }

    protected onCleanup(): void {
        this.container.removeElement(this.hoverBox);
        this.entities.toggleInput(true);
    }
}
