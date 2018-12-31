import path from 'path';
import glob from 'glob';
import Connection from './class/Connection';
import createMapper from './class/create-mapper';

const loadModels = config => {
	let modelsDir = 'src/backend/models';
	if (config.models && config.models.directory) {
		modelsDir = config.models.directory;
	}
	return glob
		.sync(`${modelsDir}/*.js`)
		.map(each => require(path.resolve('.', each)));
};

const createMappers = (models, connection) => {
	const mappers = models.map(model => createMapper(model, connection));
	return mappers;
};

const createConnection = dbConfig => {
	const connection = new Connection(dbConfig);
	return connection;
};

const expressOrm = async config => {
	const db = createConnection(config.database);
	const models = loadModels(config);
	const mappers = createMappers(models, db);
	await db.build(mappers);
	return (req, res, next) => {
		req.db = db;
		req.models = models;
		req.mappers = mappers;
		next();
	};
};

export {loadModels, createMappers, createConnection, expressOrm};

export default async config => {
	const db = createConnection(config.database);
	await db.connect();
	const models = loadModels(config);
	const mappers = createMappers(models, db);
	// Const structure = await db.introspect();
	await db.build(mappers);
	return {
		db,
		models,
		mappers
	};
};
