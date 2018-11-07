async function dropAllTables() {
	const tools = this._tools;
	if (!tools) {
		throw require('../error/messages').NO_TOOLS;
	}
	const res = await tools.dropAllTables.call(this);
	return res;
}

async function hasTable(tableName) {
	const tools = this._tools;
	if (!tools) {
		throw require('../error/messages').NO_TOOLS;
	}
	const res = await tools.hasTable.call(this, tableName);
	return res;
}

async function createTables(mappers) {
	const tools = this._tools;
	if (!tools) {
		throw require('../error/messages').NO_TOOLS;
	}
	if (!Array.isArray(mappers)) {
		mappers = [mappers];
	}
	mappers = await Promise.all(
		mappers.map(async mapper => {
			const response = await hasTable.call(this, mapper.name);
			console.log(`${mapper.name} does ${response ? '' : 'not'} exist`);
			if (!response) {
				await createTable.call(this, mapper);
			}
			return mapper;
		})
	);
	await tools.formAllRelations.call(this, mappers);
	return mappers;
}

async function createTable(mapper) {
	const tools = this._tools;
	if (!tools) {
		throw require('../error/messages').NO_TOOLS;
	}
	if (!mapper.name) {
		throw require('../error/messages').MODEL_NO_NAME;
	}
	await tools.createTable.call(this, mapper);

	return mapper;
}

async function dropTable(tableName) {
	const tools = this._tools;
	if (!tools) {
		throw require('../error/messages').NO_TOOLS;
	}
	const res = await tools.dropTable.call(this, tableName);
	return res;
}

export default {
	dropTable,
	dropAllTables,
	hasTable,
	createTables,
	createTable
};
