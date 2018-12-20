function connect() {
	const {Pool} = require('pg');
	this.connection.schema = this.connection.schema || 'nuzu';
	const client = new Pool({
		...this.connection
	});

	this.client = client;
	this.raw = client.query;
}

async function testConnection() {
	try {
		if (!this.client) {
			throw new Error('Invalid pg client. Unable to test connection');
		}
		const response = await this.client.query(`SELECT 1+1 AS "result"`);
		return response.rows[0].result === 2;
	} catch (error) {
		console.log('ERROR: Unable to connect to database.');
		console.log(error);
		return false;
	}
}

function disconnect() {
	if (!this.client) return true;
	this.client.end();
	delete this.client;
	delete this.raw;
	return true;
}

async function getTables() {
	const tables = await this.client.query(`SELECT 
    table_name AS name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
    ${
			this.connection.schema
				? `AND table_schema = '${this.connection.schema}'`
				: ''
		}
    AND table_schema NOT IN ('pg_catalog', 'information_schema');`);
	return tables.rows.map(row => row.name);
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
	const doesHaveTable = await this.client.query(`SELECT EXISTS(
        SELECT * 
        FROM information_schema.tables 
        WHERE 
          table_schema = '${this.connection.schema}' AND 
          table_name = '${tableName}'
    )`);
	return doesHaveTable.rows[0].exists;
}

async function getColumns(tableName) {
	const {rows} = await this.client.query(`SELECT
c.column_name AS name, 
c.is_nullable AS nullable, 
c.data_type AS "dataType",
c.character_maximum_length AS length
FROM  information_schema.columns c
WHERE c.table_name = '${tableName}'
${
		this.connection.schema
			? `AND table_schema = '${this.connection.schema}'`
			: ''
	}
`);
	return rows;
}

async function getForeigns(tableName) {
	const {rows} = await this.client.query(`SELECT 
    i.CONSTRAINT_NAME as "constraint_name", k.COLUMN_NAME as "column_name"
    FROM information_schema.TABLE_CONSTRAINTS i
    LEFT JOIN information_schema.KEY_COLUMN_USAGE k 
        ON i.CONSTRAINT_NAME = k.CONSTRAINT_NAME 
    WHERE i.CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND i.TABLE_NAME = '${tableName}';`);
	return rows.map(a => a.column_name);
}

async function dropForeigns(tableName) {
	await this.client.query(`DO $$
    declare r record;
    BEGIN
    FOR r IN (SELECT 
        i.CONSTRAINT_NAME as "constraint_name"
        FROM information_schema.TABLE_CONSTRAINTS i
        WHERE i.CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND i.TABLE_SCHEMA='${this.connection.schema}' 
        AND i.TABLE_NAME = '${tableName}') LOOP
      raise notice '%','dropping '||r."constraint_name";
      execute CONCAT('ALTER TABLE "${
				this.connection.schema
			}"."${tableName}" DROP CONSTRAINT '||r."constraint_name");
      
    end loop;
    end;
    $$
    `);
	return true;
}

async function dropTable(tableName) {
	await this.client.query(`DROP TABLE "${tableName}"`);
	return true;
}

async function dropAllTables() {
	const tables = await getTables.call(this);
	if (tables.length > 0) {
		await Promise.all(
			tables.map(async table => {
				await dropForeigns.call(this, table);
			})
		);
		await Promise.all(
			tables.map(async table => {
				await dropTable.call(this, table);
			})
		);
	}
	return true;
}

async function introspectDatabase() {
	// Introspects the database
	// first looks up the tables in the connection
	const tables = await getTables.call(this);
	// Sort these tables out, only picking out tables not
	// explicitly reserved for arrays or relations
	const tableObject = tables.reduce(
		(acc, table) => {
			if (
				!table.startsWith('array_') &&
				!table.startsWith('relation_') &&
				!table.startsWith('junction_')
			) {
				acc.definitions[table] = {
					name: table,
					properties: {},
					options: {}
				};
			}
			return acc;
		},
		{definitions: {}}
	);
	const structure = await tables.reduce(async (prevPromise, tableName) => {
		const acc = await prevPromise;
		const columns = await getColumns.call(this, tableName);
		if (tableName.startsWith('array_')) {
			if (columns.length === 0) return acc;
			const valueColumn = columns.find(column => column.name === 'value');
			acc.definitions[tableName.split('_')[1]].properties[
				tableName.split('_')[2]
			] = {
				type: getStandardType(valueColumn.dataType),
				databaseType: valueColumn.dataType,
				array: true,
				required: valueColumn.nullable === 'NO',
				length: valueColumn.length
			};
		} else if (
			tableName.startsWith('relation_') ||
			tableName.startsWith('junction_')
		) {
			const [, table1, table2] = tableName.split('_');
			acc.definitions[table1].properties[table2] = {
				type: 'Reference',
				dbType: 'id',
				reference: table2
			};
			acc.definitions[table2].properties[table1] = {
				type: 'Reference',
				dbType: 'id',
				reference: table1
			};
		} else {
			columns.map(column => {
				if (column.name === 'createdAt' || column.name === 'updatedAt') {
					acc.definitions[tableName].options.timestamps = true;
				} else if (column.name === 'id') {
					acc.definitions[tableName].options.primary = 'id';
				} else if (column.name === 'short') {
					acc.definitions[tableName].options.shortid = true;
				} else if (column.name === 'uuid') {
					acc.definitions[tableName].options.uuid = true;
				} else {
					acc.definitions[tableName].properties[column.name] = {
						type: getStandardType(column.dataType, column),
						dbType: column.dataType,
						required: column.nullable === 'NO',
						length: column.length
					};
				}
				return column;
			});
		}
		return acc;
	}, Promise.resolve(tableObject));
	return structure;
}

async function createTable(mapper) {
	const {name, columns} = mapper;
	const columnNames = Object.keys(columns).filter(column => column !== 'id');
	try {
		const query = `CREATE TABLE "${name}"(
    "id" serial PRIMARY KEY,
${columnNames.map((c, i) => {
			const column = columns[c];
			return `    "${c}" ${getPGType(column)}${
				column.required ? ' NOT NULL' : ''
			}${column.unique ? ' UNIQUE' : ''}${
				column.defaultValue !== undefined
					? ` DEFAULT ${parseValue(column.defaultValue)}`
					: ''
			}`;
		}).join(`,
    `)}
)`;
		const res = await this.client.query(query);
		return res;
	} catch (error) {
		console.log('unable to create');
		console.log(error);
		return false;
	}
}

async function formAllRelations(mappers) {
	await Promise.resolve(2);
}

async function insertOne(entry) {
	const query = queryInsert(this.name, entry);
	console.log(query);
	const {rows} = await this.connection.client.query(query);
	return rows[0];
}

async function insertMany(entry) {
	// There is potential to optimise this into one query
	const rows = await Promise.all(
		entry.map(async each => {
			const query = queryInsert(this.name, each);
			const res = await this.connection.client.query(query);
			return res.rows[0];
		})
	);
	return rows;
}

const queryInsert = (tableName, entry) => {
	return `INSERT INTO "${tableName}"
    (${Object.keys(entry)
			.map(a => `"${a}"`)
			.join(', ')})
    VALUES (${Object.values(entry)
			.map(a => parseValue(a))
			.join(', ')})
    RETURNING *`;
};

const getStandardType = databaseType => {
	switch (databaseType.toLowerCase()) {
		case 'integer':
			return 'integer';
		case 'timestamp with time zone':
		case 'timestamp without time zone':
			return 'datetime';
		case 'boolean':
			return 'boolean';
		case 'character varying':
		case 'string':
		case 'text':
		case 'character':
		default:
			return 'string';
	}
};

const getPGType = column => {
	const {type, array, length = 255} = column;
	switch (type.toLowerCase()) {
		case 'string':
			return `varchar (${length})${array ? '[]' : ''}`;
		case 'integer':
			return `int${array ? '[]' : ''}`;
		case 'float':
		case 'number':
		case 'decimal':
			return `float${array ? '[]' : ''}`;
		case 'boolean':
			return `bool${array ? '[]' : ''}`;
		case 'date':
			return `date${array ? '[]' : ''}`;
		case 'datetime':
		case 'timestamp':
		case 'time':
			return `timestamp with time zone${array ? '[]' : ''}`;
		case 'reference':
		case 'relation':
			return `integer${array ? '[]' : ''}`;
		default:
			return `varchar (255)${array ? '[]' : ''}`;
	}
};

const parseValue = value => {
	if (value === false) return `FALSE`;
	if (value === true) return `TRUE`;
	if (Array.isArray(value)) {
		return JSON.stringify(value.map(each => parseValue(each)));
	}
	if (typeof value === 'string') return `'${value}'`;
	if (value instanceof Date) return `'${require('moment')(value).format()}'`;
	return value;
};

module.exports = {
	connect,
	testConnection,
	disconnect,
	hasTable,
	getTables,
	dropAllTables,
	introspectDatabase,
	getForeigns,
	createTable,
	formAllRelations,
	insertOne,
	insertMany
};
