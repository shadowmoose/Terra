const readline = require('readline');
const chalk = require('chalk');


exports.prompt = async (message, defVal = null, isNum=false) => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	const pr = `${message} ${defVal? `(${chalk.yellowBright(defVal)})`:''}: `;

	return new Promise(res => {
		rl.question(pr, val => {
			rl.close();
			const ret = val.trim() || defVal;
			res(isNum ? parseInt(ret) : ret);
		});
	})
}
