function connect(config) {
	const knex = require('knex')({
		client: config.dialect,
		connection: config.connection
	});

	this.client = knex;
	this.raw = this.client.raw;
}

async function testConnection() {
	try {
		if (!this.raw) {
			throw new Error('Invalid knex client. Unable to test connection.');
		}
		const response = await this.raw('SELECT 1+1 AS "result"');
		let assertion = false;
		switch (this.dialect) {
			case 'postgres':
				assertion = require('./pg').testConnection(response);
				break;
			case 'sqlite':
				assertion = require('./lite').testConnection(response);
				break;
		}
		if (!assertion) {
			throw new Error('Failed connection test');
		}
		this.isConnected = true;
		console.log('Connection to database successful');
	} catch (error) {
		console.log('ERROR: Unable to connect to database.');
		console.log(error);
	}
}

function disconnect() {
	const knex = this.client;
	knex.destroy();
}

module.exports = {
	connect,
	disconnect,
	testConnection
};
