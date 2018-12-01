async function getTables() {
	let tables;
	switch (this.dialect) {
		case 'postgres':
			tables = await require('./pg').getTables.call(this);
			break;
		case 'sqlite':
			tables = await require('./lite').getTables.call(this);
			break;
		default:
			break;
	}
	return tables;
}

async function getColumns(tableName) {
	let columns;
	switch (this.dialect) {
		case 'postgres':
			columns = await require('./pg').getColumns.call(this, tableName);
			break;
		case 'sqlite':
			columns = await require('./lite').getColumns.call(this, tableName);
			break;
		default:
			break;
	}
	return columns;
}

async function introspectDatabase() {
	const tables = await getTables.call(this);
	const tableObject = tables.reduce((acc, table) => {
		if (
			!table.startsWith('array_') &&
			!table.startsWith('relation_') &&
			!table.startsWith('junction_')
		) {
			acc[table] = {
				name: table,
				properties: {},
				options: {}
			};
		}
		return acc;
	}, {});
	const schema = await tables.reduce(async (prevPromise, table) => {
		const acc = await prevPromise;
		const columns = await getColumns.call(this, table);
		if (table.startsWith('array_')) {
			if (columns.length === 0) return acc;
			const valueColumn = columns.filter(column => column.name === 'value')[0];
			acc[table.split('_')[1]].properties[table.split('_')[2]] = {
				type: require('./types').getStandardType(valueColumn.datatype),
				dbType: valueColumn.datatype,
				array: true,
				required: valueColumn.nullable === 'NO',
				length: valueColumn.length
			};
		} else if (table.startsWith('relation_') || table.startsWith('junction_')) {
			const [, table1, table2] = table.split('_');
			acc[table1].properties[table2] = {
				type: 'Reference',
				dbType: 'id',
				reference: table2
			};
			acc[table2].properties[table1] = {
				type: 'Reference',
				dbType: 'id',
				reference: table1
			};
		} else {
			columns.map(column => {
				if (column.name === 'createdAt' || column.name === 'updatedAt') {
					acc[table].options.timestamps = true;
				} else if (column.name === 'id') {
					acc[table].options.primary = 'id';
				} else if (column.name === 'short') {
					acc[table].options.shortid = true;
				} else if (column.name === 'uuid') {
					acc[table].options.uuid = true;
				} else {
					acc[table].properties[column.name] = {
						type: require('./types').getStandardType(column.datatype),
						dbType: column.datatype,
						required: column.nullable === 'NO',
						length: column.length
					};
				}
				return column;
			});
		}
		return acc;
	}, Promise.resolve(tableObject));
	// Console.log(JSON.stringify(schema))
	// console.log(`Found ${rows.length} tables in database: ${rows.map(a => `"${a.name}"`).join(", ")}`)
	// sys.tables vs information_schama.tables
	return schema;
}

async function hasTable(tableName) {
	if (Array.isArray(tableName)) {
		const res = await Promise.all(
			tableName.map(async each => {
				const eachHasTable = await hasTable.call(this, each);
				return eachHasTable;
			})
		);
		return res;
	}
	const rows = await getTables.call(this);
	return rows.includes(tableName);
}

async function dropAllTables() {
	const rows = await getTables.call(this);
	if (rows.length > 0) {
		await Promise.all(
			rows.map(async row => {
				const res = await dropForeigns.call(this, row);
				return res;
			})
		);
		await Promise.all(
			rows.map(async row => {
				const res = await dropTable.call(this, row);
				return res;
			})
		);
	}
	return true;
}

async function dropTable(tableName) {
	await this.raw(`DROP TABLE "${tableName}"`);
	console.log(`...dropped ${tableName}`);
	return true;
}

async function getForeigns(tableName) {
	let foreigns;
	switch (this.dialect) {
		case 'postgres':
			foreigns = await require('./pg').getForeigns.call(this, tableName);
			break;
		case 'sqlite':
			foreigns = await require('./lite').getForeigns.call(this, tableName);
			break;
		default:
			break;
	}
	return foreigns;
}

async function dropForeigns(tableName) {
	const knex = this.client;
	let foreigns = await getForeigns.call(this, tableName);
	if (!Array.isArray(foreigns)) {
		foreigns = [foreigns];
	}
	await knex.schema.table(tableName, t => {
		foreigns.map(foreign => t.dropForeign(foreign));
	});
}

module.exports = {
	getTables,
	getColumns,
	introspectDatabase,
	hasTable,
	dropAllTables,
	dropTable,
	getForeigns,
	dropForeigns
};
