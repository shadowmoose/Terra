const CanvasPlus = require('pixl-canvas-plus');
const { resolve, basename, dirname, relative } = require('path');
const { readdir, writeFile, mkdir, stat } = require('fs').promises;
const PNG = require('pngjs').PNG;
const imgScramble = require('image-scramble');


if(!process.env.REACT_APP_SPRITE_KEY) throw Error("No sprite key set in ENV!");

const images = {};

async function* getFiles(dir) {
	const dirents = await readdir(dir, { withFileTypes: true });

	for (const dirent of dirents) {
		const res = resolve(dir, dirent.name);
		if (dirent.isDirectory()) {
			yield* getFiles(res);
		} else {
			yield res;
		}
	}
}

const addImage = (base, f) => {
	const sp = f => f.replace(/\\/gm, '/').split('/').filter(ff => ff.replace(/\./gm, '').length);
	const ext = f.substr(f.lastIndexOf('.'));
	const name = basename(f, ext);
	const pureName = name.replace(/[0-9\s_]+$/gm, '').trim().replace(/\s/g, '_');
	const animated = dirname(f).includes('animated');
	const tags = sp(relative(base, dirname(f)).toLowerCase()).concat(pureName);
	const relPath = tags.join('.');

	console.log(f);
	console.log('\tName: ', name)
	console.log('\tRelPath: ', relPath)
	console.log('\tPure name: ', pureName)
	console.log('\ttags: ', tags)

	const imp = (images[relPath] = images[relPath] || { name: '', images: [] });

	if (animated) { imp.animated = 1; }
	imp.name = pureName;
	imp.images.push({
		fullPath: f
	})
}


async function isBlocker(sub) {
	const fs = require('fs');
	return new Promise(res => {
		fs.createReadStream(sub)
			.pipe(new PNG({}))
			.on('parsed', function() {
				for (let y = 0; y < this.height; y++) {
					for (let x = 0; x < this.width; x++) {
						let idx = (this.width * y + x) << 2;

						// this.data[idx]     - red channel
						// this.data[idx + 1] - green channel
						// this.data[idx + 2] - blue channel

						// this.data[idx + 3] - alpha channel

						// if there is at least one pixel
						// which transparent for more than 30%
						// then transparency valuable to us
						if (this.data[idx + 3] < 255) return res(false)
					}
				}
				return res(true);
			});
	})
}

const run = async(imageDir, outDir, uid, width=48, height=48) => {
	let count = 0;
	for await (const f of getFiles(imageDir)) {
		if (f.includes('.png')) {
			addImage(imageDir, f);
			count++;
		}
	}

	console.log(`Found ${count} images.\n\t+Building composite sheet...`);

	const cols = Math.ceil(Math.sqrt(count));
	const rows = Math.ceil(count / cols);
	const canvas = new CanvasPlus( cols * width, rows * height);
	let row = 0;
	for (const imp of Object.values(images)) {
		for (const img of imp.images) {
			const x = (row % cols) * width;
			const y = Math.floor(row++/cols) * height;
			const sub = new CanvasPlus();

			await sub.load(img.fullPath);
			await canvas.composite({
				image: sub,
				gravity: "northwest",
				width,
				height,
				offsetX: x,
				offsetY: y,
				antialias: 'nearest'
			});

			if (await isBlocker(img.fullPath)) {
				img.blocker = true;
			}

			delete img.fullPath;
			img.x = x;
			img.y = y;
		}
	}

	const buf = await canvas.write({"format": "png", "quality": 100});
	const imageFile = `${outDir}/sheet-${uid}.unencrypted.png`;
	await mkdir(outDir, { recursive: true })
	await writeFile(imageFile, buf);
	await writeFile(`${outDir}/sheet-data.json`, JSON.stringify({
		metadata: { width, height, count , uid },
		sprites: images
	}, null, 2));
	console.log('Built sprite sheet. Compressing...');

	const sz = (await stat(imageFile)).size;
	// await crush(imageFile, outDir);

	return new Promise(res => {
		imgScramble({
			image: imageFile, // source
			seed: process.env.REACT_APP_SPRITE_KEY, // seed
			sliceSize: 24, // slice size
			dest: `${outDir}/sheet-${uid}.enc.png` // dest
		},function(err){
			if (err) console.error(err);
			res();
		})
	})

}



run('../../images/', `../../src/resources`, 'composite').then(() => console.log('Finished.'));
