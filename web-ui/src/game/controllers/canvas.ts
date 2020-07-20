import Draggable from '../util/draggable';
import Middleware from "../middleware/middleware";
import EntityLayer from "./entities";
import {boardTileHeight, boardTileWidth, imageHeightPx, imageWidthPx} from "../consts";


export class CanvasContainer {
    private readonly base: HTMLDivElement;
    private readonly wrapper: HTMLDivElement;
    private readonly canvases: (Canvas|EntityLayer)[] = [];
    private width: number;
    private height: number;
    private renderer: any;

    constructor(width: number = 4800, height: number = 4800) {
        this.width = width;
        this.height = height;
        this.base = document.createElement('div');
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'canvasWrapper';
        this.wrapper.style.backgroundColor = 'gray';
        this.base.className = 'canvasBase';

        this.base.prepend(this.wrapper);
        document.body.prepend(this.base);
        this.renderer = Draggable(this.wrapper, this.base);
        this.setCanvasSize(width, height);
        this.resetView();
    }

    public addLayer(canvas: Canvas|EntityLayer) {
        this.canvases.push(canvas);
        canvas.setSize(this.width, this.height);
        canvas.appendTo(this.wrapper);
    }

    public addElement(object: HTMLElement) {
        return this.wrapper.appendChild(object);
    }

    public removeElement(object: HTMLElement) {
        return this.wrapper.removeChild(object);
    }

    public setCanvasSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.wrapper.style.width = `${this.width}px`;
        this.wrapper.style.height = `${this.height}px`;
        this.canvases.forEach(c => c.setSize(width, height));
        this.resetView();
    }

    public resetView() {
        this.renderer.panTo({
            originX: this.width/2 * -1 + this.base.getBoundingClientRect().width/2,
            originY: this.height/2 * -1 + this.base.getBoundingClientRect().height/2,
            scale: 0.99
        });
    }

    /**
     * Convert the given screen pixel coords to the (nearest) Board tile (x,y) pair.
     */
    public screenToBoard(x: number, y: number) {
        const rect = this.wrapper.getBoundingClientRect();
        const scale = this.renderer.state.transformation.scale;

        console.log('locating:', x, y, scale, rect);
        const coords = {
            x: Math.max(0, Math.min(boardTileWidth-1, Math.floor((x - rect.x) / scale / imageWidthPx))),
            y: Math.max(0, Math.min(boardTileHeight-1, Math.floor((y - rect.y) / scale / imageHeightPx)))
        };

        console.log(coords);

        return coords
    }
}

export class Canvas {
    public readonly name: string;
    protected readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    constructor(name: string) {
        this.name = name;
        this.canvas = document.createElement('canvas');
        this.canvas.id = `canvas-${name}`;
        this.canvas.className = 'canvasBackground';

        // @ts-ignore
        this.context = this.canvas.getContext('2d');
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    public get ctx(): CanvasRenderingContext2D {
        return this.context;
    }

    public get width(): number {
        return this.canvas.width;
    }

    public get height(): number {
        return this.canvas.height;
    }

    public setSize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    public appendTo(ele: HTMLDivElement) {
        ele.append(this.canvas);
    }

    public registerMiddleware(mdl: Middleware) {
        mdl.attach(this.canvas);
    }
}
