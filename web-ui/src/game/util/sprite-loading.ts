import sheetSRC from '../../resources/sheet-composite.enc.png';
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

export const waitForSpriteLoad: Promise<any> = new Promise(res => {
	const img = new Image();
	img.onerror = err => {
		console.error(err);
		alert('Failed to waitForSpriteLoad sprite sheet! Cannot continue!');
	};
	img.onload = () => {
		sheet = unscramble(img, 24, 'GaiaV2SheetKey-mk1'); // Support the artists - buy from them!
		res();
	};
	img.src = sheetSRC;

	clearInterval(fpsTicker);
	fpsTicker = setInterval(() => {
		globalFrameIndex++;
		globalFrameIndex %= 1000;
	}, 200);
});

/**
 * Locates the metadata for a given Sprite. Raises an Error if the key cannot be found.
 * @param key
 */
function findSpriteData(key: Sprite): DataSprite {
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
export function searchImages(term: string, animated: boolean = false, nameOnly: boolean = false) {
	const res: Sprite[] = [];
	const search = Object.entries(data.sprites).filter( (obj) => {
		if (animated && !obj[1].animated) {
			return false;
		}
		if (nameOnly) {
			return obj[1].name.includes(term);
		}

		return obj[0].includes(term.toLowerCase())
	}).map(o => ({ path: o[0], sprite: o[1]}));
	if (!animated) {
		search.forEach(o => {
			for(let i=0; i < o.sprite.images.length; i++) {
				res.push(new Sprite(o.path, i));
			}
		})
	} else {
		search.forEach(o => {
			res.push(new Sprite(o.path, -1));
		})
	}

	return res;
}

/**
 * SpriteKeys are used to concisely represent an image (by ID) from the datasheet,
 * as well as which index to use for animating.
 */
export class Sprite {
	public readonly id: string;
	public readonly idx: number;

	constructor(id: string, idx: number) {
		this.id = id;
		this.idx = idx;
	}

	get composite(): string {
		return `${this.id}:${this.idx}`;
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

	public drawTo(ctx: CanvasRenderingContext2D, x: number, y: number) {
		drawImageTo(ctx, this, x, y);
	}
}


/*
	Wrapper for an entire sprite search/selection window.
	Created with a default ID unless specified. All defaults are the same ID, and will overwrite each other to prevent HTML leaks.
	Supports hooking the "onChange(function)" function, in order to adjust settings.

	The image, once selected and loaded/loading, can be reached through [picker].selected_image;
*/
/*class SpritePicker{
	constructor(uid=false){
		let self = this;
		this.folder_base = 'https://rofl.wtf/dnd/';
		this.uid = 0;
		if(uid)this.uid=uid;
		this.selected_image = false;
		this.on_change = function(){};

		this.base = $("<div>", {'class':'image_selector', id:'image_selector_'+self.uid});
		this.preview = $("<div>").addClass('selected_preview');
		this.input = $("<input>",{type:"text"});
		this.imagelist = $("<div>", {'class':'image_list'});

		this.input.on("keyup", function(e){
			if (e.keyCode === 13){
				self.searchImages($(this).val());
			}
		});

		this.preview.on('mouseover', function(){
			// .position() uses position relative to the offset parent,
			// so it supports position: relative parent elements
			let pos = $(this).offset();

			// .outerWidth() takes into account border and padding.
			let offset = Math.max(0, pos.left -self.base.outerWidth());
			//show the menu directly over the placeholder
			self.base.css({
				position: "absolute",
				top: pos.top + "px",
				left: offset + "px",
				zIndex: window.max_panel_index?window.max_panel_index:10,
			}).show();
			self.input.select();
		});
		this.preview.add(this.base).mouseenter(function(){
			self.base.show();
		}).mouseleave(function() {
			self.base.hide();
		});

		this.base.append($("<b>Search for Sprites:</b><br>"));
		this.base.append(this.input);
		this.base.append(this.imagelist);

		$( "#image_selector_"+this.uid ).remove();
		$(document.body).append(this.base);
		this.searchImages('/');
	}

	setDefault(image){
		this.selected_image = image;
		this.updatePreview();
	}

	// noinspection JSUnusedGlobalSymbols
	setColor(col){
		this.preview.css('background-color', col);
		console.log(col);
		if(this.selected_image)
			this.preview.css('background-color', 'inherit');
	}

	searchImages(text){
		let self = this;
		if(text.trim() === '' || !text)
			return;
		$.getJSON( self.folder_base+"images.php?term="+text, function( data ) {
			let items = [];
			$.each( data, function( key, obj ) {
				if(obj['dir']){
					let ele = $("<span>", {'class':'loaded_dir'});
					let an = $("<a>", {title:obj.text});
					an.text(obj.text);
					an.on('click', function(){
						self.searchImages(obj.id);
					});
					ele.append(an);
					items.push(ele);
					items.push($("<br>"));
				}
			});
			$.each( data, function( key, obj ) {
				if(!obj['dir']){
					//let sp = $("<span/>", {'class':'loaded_image'});
					let im = $("<img />", {src:self.folder_base+'/resources/images/spritesheets/crawl/' + obj.id, title:obj.text, 'class':'loaded_image'});
					im.on('click', function(){
						self.selectImage($(this));
					});
					//sp.append(im);
					items.push(im);
				}
			});
			self.imagelist.empty();
			let sp = $("<span>", {'class':'image_list_span'});
			items.forEach(function(e){sp.append(e);} );
			self.imagelist.append(sp);
		});
	}

	selectImage(ele){
		$( ".selected_image" ).removeClass( "selected_image" );
		console.log(ele.attr('src'));
		this.selected_image = sprites.getImage(ele.attr('src'));
		ele.addClass("selected_image");

		this.updatePreview();
		this.on_change();

		let block = false;// Auto-adjust cursor solid box, for ease of use.
		['wall', 'closed', 'statue', 'tree', 'vault', 'altar', 'uf_map'].forEach(function(h){
			if(ele.attr('src').toLowerCase().includes(h.toLowerCase()))
				block = true;
		});
		pen.setSolid(block);
	}

	updatePreview(){
		if(this.selected_image){
			this.preview.empty();
			this.preview.append($('<img />').attr('src', this.selected_image.src).css('width', '100%').css('width', '100%'));
			this.preview.css('background-color', 'inherit');
		}else{
			this.preview.html("");
		}
	}

	// Register the listen function to execute when this image is updated.
	onChange(func){
		this.on_change = func;
	}
}

*/











