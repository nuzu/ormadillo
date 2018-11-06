async function dropAllTables() {
	const tools = this._tools;
	if (!tools) {
		return console.log(
			'Unable to build because invalid dialect access is being attempted'
		);
	}
	return await tools.dropAllTables.call(this);
}

async function hasTable(tableName) {
	const tools = this._tools;
	if (!tools) {
		return console.log('No tools');
	}
	const res = await tools.hasTable.call(this, tableName);
	return res;
}

async function createTables(mappers) {
	const tools = this._tools;
	if (!tools) {
		return console.log('No tools');
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
		return console.log(
			'Unable to build because invalid dialect access is being attempted'
		);
	}
	if (!mapper.name) {
		throw 'Each model needs to have a name';
	}
	await tools.createTable.call(this, mapper);

	return mapper;
}

async function dropTable(tableName) {
	const tools = this._tools;
	if (!tools) {
		return console.log(
			'Unable to build because invalid dialect access is being attempted'
		);
	}
	await tools.dropTable.call(this, tableName);
}

export default {
	dropTable,
	dropAllTables,
	hasTable,
	createTables,
	createTable
};
