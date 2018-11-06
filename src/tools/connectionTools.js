const chooseTools = dialect => {
	switch (dialect) {
		case 'postgres':
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

export default {
	config(dbConfig, name) {
		this.isConnected = false;
		this.name = name;
		this.dialect = dbConfig.dialect;
		this._dbOptions = dbConfig.options;
		this._tools = chooseTools(this.dialect);
		if (dbConfig.connection.schema) {
			this.pgSchema = dbConfig.connection.schema;
		}
	},
	connect(config) {
		const tools = this._tools;
		if (!tools) {
			return console.log(
				'Unable to connect because invalid dialect access is being attempted'
			);
		}
		tools.connect.call(this, config);
	},
	testConnection() {
		const tools = this._tools;
		if (!tools) {
			return null;
		}
		tools.testConnection.call(this);
	},
	async introspectDatabase() {
		const tools = this._tools;
		if (!tools) {
			return null;
		}
		const structure = await tools.introspectDatabase.call(this);
		this._dbStructure = structure;
		return structure;
	},
	async disconnect() {
		const tools = this._tools;
		await tools.disconnect.call(this);
	}
};
