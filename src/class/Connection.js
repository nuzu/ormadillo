'use strict';

import connectionTools from '../tools/connection-tools';
import buildTools from '../tools/build-tools';

class Connection {
	constructor(config) {
		try {
			connectionTools.config.call(this, config);
			connectionTools.connect.call(this);
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

	async connect(config) {
		if (config) connectionTools.config.call(this, config);
		await connectionTools.connect.call(this);
		await connectionTools.testConnection.call(this);
		return this;
	}

	async disconnect() {
		await connectionTools.disconnect.call(this);
		return this;
	}

	async createTable(mapper) {
		const table = await buildTools.createTable.call(this, mapper);
		this[table.name] = table;
		return this;
	}

	async dropTable(tableName) {
		const res = await this.buildTools.dropTable.call(this, tableName);
		if (this[tableName] && res) delete this[tableName];
		return this;
	}
}

export default Connection;
