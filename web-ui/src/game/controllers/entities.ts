import {Sprite} from "../util/sprite-loading";
import {imageHeightPx, imageWidthPx} from "../consts";
import {v4 as uuid} from 'uuid';
import Middleware from "../middleware/middleware";
import EntityMiddleware from "../middleware/entity-events";
import {observable} from "mobx";
import {isHost} from "../net/peerconnection";
import EntityUpdateHandler from "../net/handlers/entity-update-handler";
import {currentUsername} from "../db/metadata-db";


export class Entity {
    @observable sprite: Sprite;
    @observable name: string;
    @observable color: string = '#000000';
    id: string;
    x: number = 0;
    y: number = 0;
    @observable visible: boolean = true;
    @observable owners: string[] = [];
    @observable saveToCampaign: boolean = false;

    constructor(sprite: Sprite, init?: Partial<Entity>) {
        this.sprite = sprite;
        this.id = uuid();
        this.name = this.id;
        if (init) {
            Object.assign(this, init)
        }
    }

   canMove() {
        return isHost() || this.owners.includes(currentUsername.get());
    }
}

export class NamePlate {
    static plates: NamePlate[] = [];
    static updateTimer: any = null;
    private readonly ele = document.createElement('div');
    private targY: number = 0;
    protected x: number = 0;
    protected y: number = 0;
    public width: number = 0;
    public height: number = 0;
    private parent: HTMLElement;
    private color: string;

    constructor(text: string, color: string, parent: HTMLElement) {
        this.ele.className = 'entityNamePlate';
        this.parent = parent;
        this.color = color;
        NamePlate.plates.push(this);
        this.update(text, this.x, this.y, this.color,false);
    }

    public update(name: string, x: number, y: number, color: string, redraw: boolean = true) {
        this.x = x;
        this.y = y;
        this.targY = y;
        this.color = color;
        this.ele.innerText = name;

        if (redraw) NamePlate.plates.map(p => p.reposition()); // Update all plate positions, since one has moved.
    }

    reposition() {
        this.y = this.targY;
        this.width = this.ele.offsetWidth;
        this.height = this.ele.offsetHeight;

        for (let i=0; i < 10; i+=1) {
            if (NamePlate.plates.some(o => o !== this && this.overlaps(o))) {
                this.y -= this.height+1;
            }
        }

        Object.assign(this.ele.style, {
            position: 'absolute',
            top: `${this.y}px`,
            left: `${this.x}px`,
            color: this.color
        });
    }

    public overlaps(other: NamePlate) {
        return !(this.x > other.right ||
            this.right < other.x ||
            this.y > other.bottom ||
            this.bottom < other.y);
    }

    public bringToFront() {
        this.parent.append(this.ele);
    }

    public remove() {
        this.ele.remove();
        NamePlate.plates = NamePlate.plates.filter(n => n !== this);
    }

    get right() {
        return this.x + this.width;
    }

    get bottom() {
        return this.y + this.height;
    }
}


export class EntityEle {
    public readonly ele = document.createElement('canvas');
    public readonly namePlate: NamePlate;
    public readonly entity: Entity;
    private timer: any = null;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly parent: HTMLElement;
    private readonly onClick: Function;

    constructor(parent: HTMLElement, plateParent: HTMLElement, entity: Entity, onClick: Function) {
        this.parent = parent;
        this.entity = entity;
        this.onClick = onClick;
        // @ts-ignore
        this.ctx = this.ele.getContext('2d');
        this.ele.width = imageWidthPx;
        this.ele.height = imageHeightPx;
        this.ele.className = 'entityWrapper';
        this.ele.addEventListener('pointerdown', () => {
            if (this.entity.canMove()) this.onClick(this)
        });

        this.namePlate = new NamePlate(entity.name, entity.color, plateParent);

        this.reposition();
        this.bringToFront();
        this.redraw();
    }

    update(props: Partial<Entity>) {
        Object.assign(this.entity, props);
        this.ele.style.opacity = this.entity.visible ? '1' : '0.5';
        this.reposition();
        if (this.timer === null) this.redraw()
    }

    remove() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
        this.ele.remove();
        this.namePlate.remove();
    }

    redraw() {
        requestAnimationFrame(() => {
            this.ctx.clearRect(0, 0, this.ele.width, this.ele.height);
            this.entity.sprite.drawTo(this.ctx, 0, 0);

            if (this.timer !== null) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (this.entity.sprite.animated) {
                this.timer = setTimeout(this.redraw.bind(this), 200);
            } else {
                this.timer = null;
            }
        });
    }

    private reposition() {
        Object.assign(this.ele.style, {
            position: 'absolute',
            top: `${this.entity.y * imageHeightPx}px`,
            left: `${this.entity.x * imageWidthPx}px`,
            cursor: 'pointer'
        });

        this.namePlate.update(
            this.entity.name,
            this.entity.x * imageWidthPx + imageWidthPx/2,
            this.entity.y * imageHeightPx - 14,
            this.entity.color
        )
    }

    bringToFront() {
        this.parent.append(this.ele);
        this.namePlate.bringToFront();
    }

    setInput(useInput: boolean) {
        Object.assign(this.ele.style, {
            'pointer-events': useInput ? 'auto' : 'none'
        });
    }
}

export default class EntityLayer {
    private readonly entityElements: Record<string, EntityEle> = {};
    private readonly ele: HTMLElement;
    private readonly plateEle: HTMLElement;
    public boardWidth: number = 0;
    public boardHeight: number = 0;
    private enableInput: boolean = true;
    @observable public selected: EntityEle|null = null;
    private middleware: EntityMiddleware;

    constructor(tileWidth: number, tileHeight: number) {
        this.ele = document.createElement('div');
        this.ele.className = 'entityContainer';
        this.plateEle = document.createElement('div');
        this.plateEle.className = 'plateContainer';
        this.middleware = new EntityMiddleware(this.ele, this);
        this.middleware.attach(this.ele);

        this.resizeBoard(tileWidth, tileHeight);
    }

    private resizeBoard(width: number, height: number) {
        this.boardWidth = width;
        this.boardHeight = height;
        for (const {entity} of Object.values(this.entityElements)) {
            const x = entity.x;
            const y = entity.y;
            if (x > this.boardWidth || y > this.boardHeight) {
                this.remove(entity.id);
            }
        }
    }

    /**  Derive new tile widthxheight whenever this canvas is resized. */
    public setSize(width: number, height: number) {
        Object.assign(this.ele.style, { width: `${width}px`, height: `${height}px`});
        Object.assign(this.plateEle.style, { width: `${width}px`, height: `${height}px`});
        this.resizeBoard(Math.floor(width/imageWidthPx), Math.floor(height/imageHeightPx));
    }

    public remove(id: string, sendUpdate: boolean = true): boolean {
        const existing = this.entityElements[id];
        if (existing) {
            this.entityElements[id].remove();
            delete this.entityElements[id];
            if (sendUpdate) EntityUpdateHandler.sendDelete(existing.entity);
        }
        if (existing === this.selected) this.selected = null;
        return !!existing;
    }

    public addEntity(sprite: Sprite, opts?: Partial<Entity>, sendUpdate: boolean = true) {
        const ent = new Entity(sprite, opts);
        const entEle = new EntityEle(this.ele, this.plateEle, ent, this.select.bind(this));

        entEle.setInput(this.enableInput);
        this.entityElements[ent.id] = entEle;

        if (sendUpdate) EntityUpdateHandler.sendUpdate(ent);

        // Upon creation, we need a frame for the bounding box to update with the new name:
        if (NamePlate.updateTimer !== null) clearTimeout(NamePlate.updateTimer);
        NamePlate.updateTimer = setTimeout(() => NamePlate.plates.map(p => p.reposition()), 1);

        return ent;
    }

    public select(entEle: EntityEle|null) {
        this.selected = entEle;
        console.debug('Selected entity:', this.selected);
        this.middleware.setTarget(entEle);
        if (this.selected) {
            Object.values(this.entityElements).forEach(e => {
                if (e !== this.selected) e.setInput(false)
            });
        }
    }

    public entityIsOwned(id: string, checkOwner: string) {
        const existing = this.entityElements[id];
        if (existing) {
            return existing.entity.owners.includes(checkOwner);
        }
        return false;
    }

    public updateEntity(id: string, props: Partial<Entity>, sendUpdate: boolean=true) {
        const existing = this.entityElements[id];
        if (existing) {
            existing.update(props);
            if (sendUpdate) EntityUpdateHandler.sendUpdate(existing.entity);
        }
        return !!existing;
    }

    public toggleInput(enabled: boolean, acceptHover: boolean = true) {
        if (enabled !== this.enableInput) {
            this.enableInput = enabled;
            Object.values(this.entityElements).forEach(ent => {
                ent.setInput(enabled);
            });
            Object.assign(this.ele.style, {
                'pointer-events': (!acceptHover || this.enableInput) ? 'none' : 'auto'
            });
        }
    }

    /**
     * Directly export the underlying terrain map, for serialization.
     */
    getEntityList() {
        return Object.values(this.entityElements).map(e => e.entity);
    }

    /**
     * Import a serialized tile map, over the current data.
     */
    setEntityList(entities: Entity[]) {
        // TODO: Implement.
    }

    public appendTo(ele: HTMLDivElement) {
        ele.append(this.ele);
        ele.append(this.plateEle)
    }

    public registerMiddleware(mdl: Middleware) {
        mdl.attach(this.ele);
    }
}
