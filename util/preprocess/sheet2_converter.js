const CanvasPlus = require('pixl-canvas-plus');
const { resolve, basename, dirname, relative } = require('path');
const { readdir, writeFile, mkdir, stat } = require('fs').promises;
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const fs = require('fs');
const path = require('path');



const outdir = '../../images/ORYX/fantasy/animated/entity/'
const imageDir = `../../images_oryx_2\\Sliced\\creatures_24x24`;
const names = fs.readFileSync(`../../images_oryx_2/name-map.txt`).toString().split('\n').map(ln => ln.trim()).filter(ln=>!!ln);
const files = [];
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


async function parse() {
	throw Error('Disabled - requires manual fixing.');
	let count = 0;
	for await (const f of getFiles(imageDir)) {
		if (f.includes('.png')) {
			console.log(f);
			files.push(f)
		}
	}

	files.sort((a, b) => {
		const f = parseInt(a.substring(a.lastIndexOf('_')+1).replace('.png', ''));
		const s = parseInt(b.substring(b.lastIndexOf('_')+1).replace('.png', ''));
		return f-s;
	});

	for (let i = 0; i < files.length; i+=1) {
		const first = files[i];
		const second = files[i+18];

		if (i+18 < files.length) files[i+18] = null;

		if (first && second) {
			console.log(first, second);
			images[names.shift()] = [first, second];
		}
	}

	for (const name of Object.keys(images)) {
		const imgs = images[name];
		for(const img of imgs){
			const out = path.join(outdir, name.replace(/\s/g, '_').toLowerCase())+ '_' + imgs.indexOf(img) + '.png';
			const canvas = new CanvasPlus( 48, 48);
			const sub = new CanvasPlus();

			await sub.load(img);

			await canvas.composite({
				image: sub,
				gravity: "northwest",
				width: 48,
				height: 48,
				offsetX: 0,
				offsetY: 0,
				antialias: 'nearest'
			});

			console.log(out);

			const buf = await canvas.write({"format": "png", "quality": 100});
			await mkdir(outdir, { recursive: true })
			await writeFile(out, buf);
		}
	}
}


parse();
