const expressOrm = require('../build').expressOrm

const DATABASE_POSTGRES = {
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
};

const DATABASE_SQLITE = {
	name: 'sqlite',
	dialect: 'sqlite',
	connection: {
		filename: './test/db/db.sqlite'
	},
	options: {
		alwaysRebuild: true
	}
};

const config = {
		models: {
			directory: './test/models'
		},
		database: DATABASE_POSTGRES
};

const ormMiddleware = expressOrm(config)

module.exports = ormMiddleware