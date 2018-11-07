'use strict';

import connectionTools from '../tools/connection-tools';
import buildTools from '../tools/build-tools';

class Connection {
	constructor(config, name) {
		try {
			connectionTools.config.call(this, config, name);
			connectionTools.connect.call(this, config);

			connectionTools.testConnection.call(this);
			connectionTools.introspectDatabase.call(this);
		} catch (error) {
			console.log(error.message);
		}
	}

	async build(mappers) {
		if (this._dbOptions.alwaysRebuild) {
			const res = await buildTools.dropAllTables.call(this);
			if (res) {
				const tables = await buildTools.createTables.call(this, mappers);
				await Promise.all(
					tables.map(table => {
						this[table.name] = table;
						return table;
					})
				);
			}
		}
	}

	async hasTable(tableName) {
		const res = await buildTools.hasTable.call(this, tableName);
		return res;
	}

	async connect() {}

	async disconnect() {
		const res = await connectionTools.disconnect.call(this);
		return res;
	}

	async createTable(mapper) {
		await buildTools.createTable.call(this, mapper);
		return mapper;
	}

	async dropTable(tableName) {}

	async insert(tableName, item, insertOptions) {
		console.log(this);
	}
}

export default Connection;
