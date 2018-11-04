const testConnection = res => {
	return res[0].result === 2;
};

async function getTables() {
	return await raw(`SELECT name
FROM sqlite_master
WHERE type='table'
ORDER BY name
`);
}

async function getColumns(tableName) {
	const columns = await this.raw(`PRAGMA table_info('${tableName}')`);
	const res = columns.map(column => ({
		name: column.name,
		datatype: column.type.split('(')[0],
		nullable: column.notnull === 0 ? 'YES' : 'NO',
		primary: column.pk === 1,
		defaultValue: column.dflt_value
	}));
	return res;
}

async function getForeigns(tableName) {
	const foreigns = await this.raw(`PRAGMA foreign_key_list(${tableName})`);
	return foreigns;
}

module.exports = {
	testConnection,
	getTables,
	getColumns,
	getForeigns
};
