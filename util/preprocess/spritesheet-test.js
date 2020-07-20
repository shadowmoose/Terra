const data = require('../../web-ui/src/resources/spritesheet/data.json');


function search(term, animatedOnly=false, nameOnly=false) {
	return Object.entries(data.sprites).filter( obj => {
		if (animatedOnly && !obj[1].animated) {
			return;
		}
		if (nameOnly) {
			return obj[1].name.includes(term);
		}

		return obj[0].includes(term.toLowerCase())
	}).map(o => ({ path: o[0], sprite: o[1]}))
}

const t0 = process.hrtime();
const res = search('anim', false, true);
const end = process.hrtime(t0);
console.log('Result:', res);
console.info('Execution time (hr): %ds %dms', end[0], end[1] / 1000000)
