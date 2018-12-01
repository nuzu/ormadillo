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
	config(dbConfig) {
		this.isConnected = false;
		this.name = dbConfig.name;
		this.dbConfig = dbConfig;
		this.dialect = dbConfig.dialect;
		this.repository = {};
		this.repo = this.repository;
		this._dbOptions = dbConfig.options;
		this._tools = chooseTools(this.dialect);
		if (dbConfig.connection.schema) {
			this.pgSchema = dbConfig.connection.schema;
		}
	},
	connect() {
		const tools = this._tools;
		const config = this.dbConfig;
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
		this.structure = structure;
		return structure;
	},
	async disconnect() {
		const tools = this._tools;
		await tools.disconnect.call(this);
	}
};
