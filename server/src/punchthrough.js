const natUpnp = require('nat-upnp');

const client = natUpnp.createClient();

const punch = (pubPort, privPort) => new Promise((res,rej) => {
	client.portMapping({
		public: pubPort,
		private: privPort,
		ttl: 10
	}, function(err) {
		if (err) rej(err);
		res(true);
	});
});


/**
 * Make the given external port resolve to the internal private port via UPNP.
 *
 * @param publicPort
 * @param privatePort
 * @return {function(): void} A function that stops the port-forwarding when called.
 */
exports.makePublic = (publicPort, privatePort) => {
	const stop = setInterval(() => punch(publicPort, privatePort), 5000);

	return () => clearTimeout(stop);
}


/**
 * Get the current external IP address.
 * @return {Promise<string>} The current external IP Address.
 */
exports.getExternalIP = async() => {
	return new Promise((res, rej) => {
		client.externalIp(function(err, ip) {
			if (err) rej(err);
			res(ip)
		});
	})
}

