const ormadillo = require('ormadillo').default;

const database = {
	postgres: {
		name: 'postgres',
		dialect: 'postgres',
		connection: {
			host: 'localhost',
			port: 5432,
			username: 'postgres',
			password: '',
			database: 'testdb',
			schema: 'public'
		},
		options: {
			alwaysRebuild: true
		}
	},
	sqlite: {
		name: 'sqlite',
		dialect: 'sqlite',
		connection: {
			filename: './test/db/db.sqlite'
		},
		options: {
			alwaysRebuild: true
		}
	}
};

const config = type => ({
	models: {
		directory: '../../test/models'
	},
	database: database[type]
});

module.exports = type => ormadillo(config(type));
