const express = require('express');
const { ExpressPeerServer } = require('peer');
const upnp = require('./punchthrough');
const {prompt} = require('./prompt');
const chalk = require('chalk');
const net = require('net');


console.log(chalk.yellowBright('    Terra Peer-to-Peer server.') + '\n\n');

let argPort = 0;
for (const arg of process.argv) {
	if (arg.startsWith('--port=')) {
		argPort = parseInt(arg.split('=')[1])
	}
}

async function getInputs() {
	return {
		port: argPort || await prompt('Which port should be exposed externally?', 9000, true),
		passKey: null
	}
}

const portInUse = async function(port) {
	return new Promise((res) => {
		const server = net.createServer(function(socket) {
			socket.write('Echo server\r\n');
			socket.pipe(socket);
		});

		server.listen(port);
		server.on('error', function (e) {
			res(true);
		});
		server.on('listening', function (e) {
			server.close();
			res(false);
		});
	})
};


getInputs().then(async (opts) => {
	const app = express();
	let {port, passKey} = opts;

	if (await portInUse(port)) throw Error('This port is already in use.')

	app.get('/', (req, res, next) => res.send('Go away.'));

	// =======  PEER.JS SERVER SETUP =========

	const server = app.listen(port, () => {
		upnp.getExternalIP().then(async ip => {
			const stop = await upnp.makePublic(9000, 9000);
			console.log(chalk.greenBright(`\nExternal Server Address: http://${ip}:${port}\n`));
		}).catch(err => {
			console.error(err);
			console.log(chalk.redBright(`Had error starting up client. Possibly cannot use UPNP with current router config!`));
		})
	});

	const peerServer = ExpressPeerServer(server, {
		path: '/',
		proxied: false,
		allow_discovery: false,
		key: passKey || 'gaia-v2-key'
	});

	// noinspection JSCheckFunctionSignatures
	app.use('/gaia/peerjs', peerServer);

	peerServer.on('connection', (client) => {
		console.log(`\t${chalk.green('+')} Client connected: ${client.id}`);
	});

	peerServer.on('disconnect', (client) => {
		console.log(`\t${chalk.red('-')} Client closed: ${client.id}`);
	});
}).catch(err => {
	console.error(err);
	console.error(chalk.redBright(err.message));
	prompt('\n\nPress enter to exit').then(() => process.exit(1))
})

