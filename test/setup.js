const ormadillo = require('../build').default;

const rebuild = true;

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
			alwaysRebuild: rebuild,
			buildFromDatabase: !rebuild
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
		directory: './test/models'
	},
	database: database[type]
});

module.exports = type => ormadillo(config(type));
