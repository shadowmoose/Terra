import sheetSRC from '../../resources/sheet-composite.enc.png';
import {SpriteInterface} from "../data/interfaces/sprite";
import {TextureKey} from "../renderer/ui-data/globals";
const rawData = require('../../resources/sheet-data.json');
const unscramble = require('./unscramble');

interface DataSheet {
	metadata: {
		width: number;
		height: number;
		count: number;
		uid: string;
	};
	sprites: Record<string, DataSprite>;
}

interface DataSprite {
	name: string;
	animated?: number;
	images: DataImage[];
}

interface DataImage {
	x: number;
	y: number;
	blocker: boolean;
}

const data: DataSheet = rawData;  // Type casting here for clarity.
let sheet: HTMLCanvasElement = document.createElement('canvas');
let spriteWidth: number = data.metadata.width;
let spriteHeight: number = data.metadata.height;
let globalFrameIndex: number = 0;
let fpsTicker: NodeJS.Timeout;

export const waitForSpriteLoad: Promise<HTMLCanvasElement> = new Promise(res => {
	const img = new Image();
	img.onerror = (err: any) => {
		console.error(err);
		alert('Failed to load sprite sheet! \nTry hard reloading the page (ctrl+F5).');
	};
	img.onload = () => {
		sheet = unscramble(img, 24, process.env.REACT_APP_SPRITE_KEY); // Support the artists - buy from them!
		res(sheet);
	};
	img.src = sheetSRC;

	clearInterval(fpsTicker);
	fpsTicker = setInterval(() => {
		globalFrameIndex = (globalFrameIndex+1) % 1000;
	}, 200);
});

/**
 * Locates the metadata for a given Sprite. Raises an Error if the key cannot be found.
 * @param key
 */
function findSpriteData(key: Sprite): DataSprite {
	if (key.id.startsWith("gif:")) {
		return {
			animated: -1,
			images: [],
			name: "loaded gif"
		}
	}
	const ret = data.sprites[key.id];
	if (!ret) throw Error(`Unable to locate sprite for key: ${key.composite}`);
	return ret;
}

/**
 * Render the image, denoted by the given Sprite, to the given Graphics 2D context.
 * @param ctx
 * @param key
 * @param x
 * @param y
 */
function drawImageTo(ctx: CanvasRenderingContext2D, key: Sprite, x: number, y: number) {
	const sprites = findSpriteData(key);
	const img = key.idx < 0 ? sprites.images[globalFrameIndex % sprites.images.length] : sprites.images[key.idx];

	ctx.drawImage(sheet, img.x, img.y, spriteWidth, spriteHeight, x, y, spriteWidth, spriteHeight);
}


/** Search for images matching the given term. */
export function searchImages(term: string, animated: boolean = false, nameOnly: boolean = false, favorites?: SpriteInterface[]) {
	const res: Sprite[] = [];
	const seen: Record<string, boolean> = {};

	const search = Object.entries(data.sprites).filter( (obj) => {
		if (animated && !obj[1].animated) {
			return false;
		}
		if (nameOnly) {
			return obj[1].name.includes(term);
		}

		return obj[0].includes(term.toLowerCase())
	}).map(o => ({ path: o[0], sprite: o[1]}));

	favorites?.forEach(f => {
		let comparatorId = f.id;
		if (comparatorId.startsWith("gif:")) {
			comparatorId = "loaded gif";
		}
		if (comparatorId.includes(term.toLowerCase())) {
			res.push(new Sprite(f.id, f.idx));
			seen[f.id+":"+f.idx] = true;
		}
	});

	if (!animated) {
		search.forEach(o => {
			for(let i=0; i < o.sprite.images.length; i++) {
				if (!seen[o.path+ ":" + i]) {
					res.push(new Sprite(o.path, i));
				}
			}
		})
	} else {
		search.forEach(o => {
			if (!seen[o.path+":-1"]) {
				res.push(new Sprite(o.path, -1));
			}
		})
	}

	res.sort((a, b) => Number(a.id.startsWith("custom.")) - Number(b.id.startsWith("custom.")));
	return res;
}

/**
 * Sprites are used to concisely represent an image (by ID) from the datasheet,
 * as well as which index to use for animating.
 */
export class Sprite implements SpriteInterface {
	public readonly id: string;
	public readonly idx: number;

	constructor(id: string, idx: number) {
		this.id = id;
		this.idx = idx;
	}

	get composite(): string {
		return this.mkKey(this.idx);
	}

	get animated(): boolean {
		return this.idx < 0;
	}

	get isBlocker(): boolean {
		if (this.idx < 0) return false;
		return findSpriteData(this).images[this.idx].blocker;
	}

	get name(): string {
		return findSpriteData(this).name;
	}

	/** Generates a unique ID for this sprite, which can be transmitted as needed. */
	private mkKey(frame: number) {
		return `${this.id}:${frame}`;
	}

	public drawTo(ctx: CanvasRenderingContext2D, x: number, y: number) {
		drawImageTo(ctx, this, x, y);
	}

	/**
	 * Get the data required for the Renderer to create a Texture from this Sprite.
	 */
	get textureData(): TextureKey[] {
		const sprites = findSpriteData(this);
		const imgs = this.idx < 0 ? sprites.images : [sprites.images[this.idx]];

		if (this.id.startsWith("gif:")) {
			return [{
				uid: this.id,
				source: waitForSpriteLoad
			}]
		}

		return imgs.map((img, idx) => {
			return {
				uid: this.mkKey(this.idx < 0 ? idx : this.idx),
				atlas: waitForSpriteLoad,
				px: img.x,
				py: img.y,
				w: spriteWidth,
				h: spriteHeight
			}
		})
	}
}
