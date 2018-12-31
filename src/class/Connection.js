'use strict';

import createMapper from './create-mapper';

class Connection {
	constructor(config) {
		this._init(config);
	}

	_init(config) {
		this.isConnected = false;
		this.name = config.name;
		this.config = config;
		this.connection = config.connection;
		this.dialect = config.dialect;
		this.repository = {};
		this.repo = this.repository;
		this._dbOptions = config.options;
		this.tools = chooseTools(config.dialect);
		if (config.connection.schema) {
			this.pgSchema = config.connection.schema;
		}
	}

	async connect(config) {
		if (config) this._init(config);
		this.tools.connect.call(this);
		const res = await this.testConnection();
		if (res) this.isConnected = true;
		return this;
	}

	async testConnection() {
		const res = await this.tools.testConnection.call(this);
		return res;
	}

	disconnect() {
		this.tools.disconnect.call(this);
		this.isConnected = false;
		return this;
	}

	async hasTable(tableName) {
		const res = await this.tools.hasTable.call(this, tableName);
		return res;
	}

	async build(mappers) {
		if (this._dbOptions.alwaysRebuild) {
			const res = await this.dropAllTables();
			if (res) {
				const tables = await this.createTables(mappers);
				await Promise.all(
					tables.map(table => {
						this.repository[table.name] = table;
						return table;
					})
				);
			}
		} else if (this._dbOptions.buildFromDatabase) {
			const structure = this.structure || (await this.introspect());
			console.log(JSON.stringify(structure));
			Object.keys(structure.definitions).forEach(key => {
				this.repository[key] = createMapper(structure.definitions[key], this);
			});
		} else if (this._dbOptions.suggestMigrations) {
			const structure = this.structure || (await this.introspect());
			console.log(structure);
		}
	}

	async createTable(mapper) {
		await this.tools.createTable.call(this, mapper);
		console.log(`Created mapper into table ${mapper.name}`);
		this.repository[mapper.name] = mapper;
		this[mapper.name] = mapper;
		return this;
	}

	async createTables(mappers) {
		if (!Array.isArray(mappers)) {
			mappers = [mappers];
		}
		mappers = await Promise.all(
			mappers.map(async mapper => {
				const response = await this.hasTable(mapper.name);
				console.log(`${mapper.name} does ${response ? '' : 'not'} exist`);
				if (!response) {
					await this.createTable(mapper);
				}
				return mapper;
			})
		);
		await this.tools.formAllRelations.call(this, mappers);
		return mappers;
	}

	async dropAllTables() {
		const res = await this.tools.dropAllTables.call(this);
		return res;
	}

	async dropTable(tableName) {
		const {repository} = this;
		const res = await this.tools.dropTable.call(this, tableName);
		if (repository[tableName] && res) delete repository[tableName];
		return this;
	}

	async introspect() {
		const structure = await this.tools.introspectDatabase.call(this);
		this.structure = structure;
		return structure;
	}
}

const chooseTools = dialect => {
	switch (dialect) {
		case 'postgres':
			return require('../adapters/pg');
		case 'mysql':
		case 'sqlite':
		case 'mssql':
			return require('../adapters/sql');
		case 'mongodb':
			return require('../adapters/mongo');
		default:
			throw new Error('This dialect is not supported yet');
	}
};

export default Connection;
