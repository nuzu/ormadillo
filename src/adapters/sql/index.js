const insert = require('./insert');
const find = require('./find');

// Connect, test connection and disconnect (3/3)

function connect() {
	const knex = require('knex')({
		client: this.dialect,
		connection: this.connection
	});
	this.client = knex;
	this.raw = this.client.raw;
	return this;
}

async function testConnection() {
	try {
		if (!this.raw) {
			throw new Error('Invalid knex client. Unable to test connection.');
		}
		const response = await this.raw('SELECT 1+1 AS "result"');
		const assertion = require('./sql').testConnection[this.dialect](response);
		if (!assertion) {
			throw new Error('Failed connection test');
		}
		console.log('Connection to database successful');
		return true;
	} catch (error) {
		console.log('ERROR: Unable to connect to database.');
		console.log(error);
		return false;
	}
}

function disconnect() {
	const knex = this.client;
	knex.destroy();
	delete this.client;
	delete this.raw;

	return true;
}

// Get all tables, if has table (2/2)

async function getTables() {
	const tables = await require('./sql').getTables[this.dialect].call(this);
	return tables;
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

// Get columns, get foreigns (2/2)

async function getColumns(tableName) {
	const columns = await require('./sql').getColumns[this.dialect](
		tableName,
		this.raw,
		this.pgSchema
	);
	return columns;
}

async function getForeigns(tableName) {
	const foreigns = await require('./sql').getForeigns[this.dialect](
		tableName,
		this.raw
	);
	return foreigns;
}

// Drop tables, drop all tables, drop foreigns
// will include drop column here

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

async function createTable(mapper) {
	const knex = this.client;
	const {name, columns, arrays} = mapper;
	await knex.schema.createTable(name, createKnexCallback(mapper));
	await Promise.all(
		arrays.map(async array => {
			await createArrayTable.call(this, columns[array], name);
		})
	);
	console.log(`New table "${name}" created successfully`);
	return mapper;
}

async function createArrayTable(array, mapperName) {
	const knex = this.client;
	const arrayTableName = `array_${mapperName}_${array.name}`;
	await knex.schema.createTable(arrayTableName, t => {
		t.increments('id');
		t.integer('key')
			.unsigned()
			.references('id')
			.inTable(mapperName)
			.onDelete('CASCADE')
			.onUpdate('CASCADE');
		t[require('./types').getKnexFunction(array.type)]('value');
	});
}

const createKnexCallback = mapper => {
	return t => {
		const {id, ...rest} = mapper.columns;
		t[require('./types').getKnexFunction(id.type)]('id'); // Custom id names ?

		for (const key in rest) {
			if ({}.hasOwnProperty.call(rest, key)) {
				const {type, defaultValue, required, array} = rest[key];
				let column;
				if (type.toLowerCase() !== 'relation') {
					if (!array) {
						column = t[require('./types').getKnexFunction(type)](key);
					}
					// If(array) column = t.specificType(key, ``)
					if (column && required) {
						column.notNullable();
					}
					if (column && defaultValue !== undefined) {
						column.defaultsTo(defaultValue);
					}
				}
			}
		}
		t.unique(mapper.uniques);
	};
};

async function formAllRelations(mappers) {
	console.log('Forming relations');
	await Promise.all(
		mappers.map(async mapper => {
			const res = await formRelations.call(this, mapper);
			return res;
		})
	);
	console.log('All relations formed');
}

async function formRelations(mapper) {
	const knex = this.client;
	const {name, relations} = mapper;
	const relationsColumns = {};
	const relationsTables = {};
	for (const key in relations) {
		if ({}.hasOwnProperty.call(relations, key)) {
			switch (relations[key].type) {
				case 'join-to-join':
				case 'join-to-one':
				case 'many-to-one':
					relationsColumns[key] = relations[key];
					break;
				case 'many-to-many':
				case 'defaultRelation':
					relationsTables[key] = relations[key];
					break;
				default:
					break;
			}
		}
	}

	await knex.schema.table(name, t => {
		for (const key in relationsColumns) {
			if ({}.hasOwnProperty.call(relationsColumns, key)) {
				t.integer(key)
					.unsigned()
					.references('id')
					.inTable(relationsColumns[key].reference)
					.onDelete('CASCADE')
					.onUpdate('CASCADE');
				if (
					['join-to-join', 'join-to-one'].includes(relationsColumns[key].type)
				) {
					t.unique(key);
				}
			}
		}
	});

	await Promise.all(
		Object.keys(relationsTables).map(async key => {
			const relation = relationsTables[key];
			await knex.schema.createTable(relation.targetTable, t => {
				t.integer(`${relation.column1}_id`)
					.unsigned()
					.references('id')
					.inTable(relation.column1)
					.onDelete('CASCADE')
					.onUpdate('CASCADE');

				t.integer(`${relation.column2}_id`)
					.unsigned()
					.references('id')
					.inTable(relation.column2)
					.onDelete('CASCADE')
					.onUpdate('CASCADE');

				t.primary([`${relation.column1}_id`, `${relation.column2}_id`]);
			});
		})
	);

	return mapper;
}

module.exports = {
	connect,
	disconnect,
	testConnection,
	getTables,
	hasTable,
	dropTable,
	dropAllTables,
	introspectDatabase,
	createTable,
	formAllRelations,
	...insert,
	...find
};
