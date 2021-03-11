module.exports = function override(config, _env) {
	//do stuff with the webpack config...
	config.module.rules.unshift({
		test: /\.worker\.(js|ts)$/i,
		use: [{
			loader: 'comlink-loader',
			options: {
				singleton: true
			}
		}]
	});
	console.debug('+ Injected comlink-loader into module build rules.');

	return config;
}
