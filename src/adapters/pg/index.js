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
    );`);
	return doesHaveTable.rows[0].exists;
}

async function getColumns(tableName) {
	const {rows} = await this.client.query(`SELECT
c.column_name AS name, 
c.is_nullable AS nullable, 
c.udt_name AS "dataType",
c.character_maximum_length AS length
FROM  information_schema.columns c
WHERE c.table_name = '${tableName}'
${
		this.connection.schema
			? `AND table_schema = '${this.connection.schema}'`
			: ''
	}
;`);
	return rows;
}

async function getForeigns(tableName) {
	const {rows} = await this.client.query(`SELECT DISTINCT
	tc.CONSTRAINT_NAME as "constraint_name", 
	kcu.COLUMN_NAME as "column_name",
	ccu.table_schema as "referenced_schema",
	ccu.table_name AS "referenced_table",
	ccu.column_name AS "referenced_column_name"
FROM information_schema.TABLE_CONSTRAINTS tc
LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
	ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME 
	AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
	ON ccu.constraint_name = tc.constraint_name
	AND ccu.table_schema = tc.table_schema
WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY' 
AND tc.TABLE_NAME = '${tableName}';`);
	return rows;
}

async function dropForeigns(tableName) {
	await this.client.query(`DO $$
declare r record;
BEGIN
FOR r IN (SELECT 
	i.CONSTRAINT_NAME as constraint_name
	FROM information_schema.TABLE_CONSTRAINTS i
	WHERE i.CONSTRAINT_TYPE = 'FOREIGN KEY'
	AND i.TABLE_SCHEMA='${this.connection.schema}' 
	AND i.TABLE_NAME = '${tableName}') LOOP
	raise notice '%','dropping '||r."constraint_name";
	execute CONCAT('ALTER TABLE "${
		this.connection.schema
	}"."${tableName}" DROP CONSTRAINT "'||r."constraint_name"||'"');
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
		const foreigns = await getForeigns.call(this, tableName);
		if (tableName.startsWith('array_')) {
			if (columns.length === 0) return acc;
			const valueColumn = columns.find(column => column.name === 'value');
			acc.definitions[tableName.split('_')[1]].properties[
				tableName.split('_')[2]
			] = {
				type: getStandardType(valueColumn.dataType),
				udtName: valueColumn.dataType,
				array: true,
				required: valueColumn.nullable === 'NO',
				length: valueColumn.length
			};
		} else if (
			tableName.startsWith('relation_') ||
			tableName.startsWith('junction_') ||
			tableName.endsWith('lnk')
		) {
			acc.definitions[foreigns[0].referenced_table].properties[
				foreigns[0].column_name.split('_')[1]
			] = {
				type: 'Reference',
				dbType: 'id',
				reference: foreigns[1].referenced_table,
				inverse: foreigns[1].column_name.split('_')[1],
				relation: 'many-to-many'
			};
			acc.definitions[foreigns[1].referenced_table].properties[
				foreigns[1].column_name.split('_')[1]
			] = {
				type: 'Reference',
				dbType: 'id',
				reference: foreigns[0].referenced_table,
				inverse: foreigns[0].column_name.split('_')[1],
				relation: 'many-to-many'
			};
		} else {
			acc.definitions[tableName].name = tableName;
			columns.map(column => {
				if (column.name === 'createdAt' || column.name === 'updatedAt') {
					acc.definitions[tableName].options.timestamps = true;
				} else if (column.name === 'id') {
					acc.definitions[tableName].options.primary = 'id';
				} else if (column.name === 'short') {
					acc.definitions[tableName].options.shortid = true;
				} else if (column.name === 'uuid') {
					acc.definitions[tableName].options.uuid = true;
				} else if (foreigns.map(a => a.column_name).includes(column.name)) {
					const foreign = foreigns.find(a => a.column_name === column.name);
					acc.definitions[tableName].properties[column.name] = {
						type: 'Reference',
						array: column.dataType.startsWith('_'),
						dbType: column.dataType,
						relation: 'many-to-one',
						reference: foreign.referenced_table,
						required: column.nullable === 'NO',
						length: column.length,
						constraintName: foreigns.constraint_name
					};
				} else {
					acc.definitions[tableName].properties[column.name] = {
						type: getStandardType(column.dataType, column),
						array: column.dataType.startsWith('_'),
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
${columnNames.map(c => {
			const column = columns[c];
			return `    "${c}" ${getPGType(column)}${
				column.required ? ' NOT NULL' : ''
			}${column.unique ? ' UNIQUE' : ''}${
				column.defaultValue === undefined
					? ''
					: ` DEFAULT ${parseValue(column.defaultValue)}`
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
	let query = ``;
	mappers.forEach(mapper => {
		Object.keys(mapper.relations).forEach(relKey => {
			switch (mapper.relations[relKey].type) {
				case 'join-to-join':
				case 'join-to-one':
				case 'many-to-one':
					query += `ALTER TABLE "${mapper.name}"
ADD CONSTRAINT "fkey_${
						mapper.relations[relKey].reference
					}_${relKey}" FOREIGN KEY ("${relKey}") REFERENCES "${
						mapper.relations[relKey].reference
					}" (id) DEFERRABLE INITIALLY DEFERRED;
`;
					break;
				case 'many-to-many':
				case 'defaultRelation':
					query += `CREATE TABLE IF NOT EXISTS "${
						mapper.relations[relKey].targetTable
					}"(
	"${mapper.relations[relKey].table1}_${
						mapper.relations[relKey].column1
					}" int REFERENCES "${mapper.relations[relKey].table1}" (id) NOT NULL,
	"${mapper.relations[relKey].table2}_${
						mapper.relations[relKey].column2
					}" int REFERENCES "${mapper.relations[relKey].table2}" (id) NOT NULL,
	PRIMARY KEY ("${mapper.relations[relKey].table1}_${
						mapper.relations[relKey].column1
					}", "${mapper.relations[relKey].table2}_${
						mapper.relations[relKey].column2
					}")
);
`;
					break;
				default:
					break;
			}
		});
	});
	console.log(query);
	await this.client.query(query);
	return true;
}

async function insertOne(entry) {
	const query = queryInsert(this, entry);
	const res = await this.connection.client.query(query);
	return res.rows[0];
}

async function insertMany(entry) {
	// There is potential to optimise this into one query
	let query = ``;
	entry.forEach(each => {
		query += queryInsert(this, each);
	});
	const res = await this.connection.client.query(query);
	const rows = res.map(each => each.rows[0]);
	return rows;
}

async function updateOne(selector, values) {
	const query = queryUpdate(this, selector, values);
	const {rows} = await this.connection.client.query(query);
	return rows[0];
}

async function updateMany(a) {
	const b = await Promise.resolve(a);
	return b;
}

async function find(entry) {
	const query = queryFind(this, entry);
	console.log(query);
	const {rows} = await this.connection.client.query(query);
	return rows;
}

async function findOne(entry) {
	const query = queryFind(this, entry);
	const {rows} = await this.connection.client.query(query);
	return rows[0];
}

const queryInsert = (mapper, entry) => {
	const values = require('lodash/reduce')(
		entry,
		(acc, value, key) => {
			if (
				mapper.properties[key] === 'defaultRelation' ||
				mapper.properties[key] === 'manyToMany'
			) {
				acc.otherTables.push({
					key,
					value,
					...mapper.relations[key]
				});
			} else if (
				mapper.properties[key] === 'manyToOne' ||
				mapper.properties[key] === 'joinToOne' ||
				mapper.properties[key] === 'joinToJoin'
			) {
				if (typeof value === 'object') {
					if (value.id) {
						acc.thisTable.push({key, value: value.id});
					} else {
						acc.joinInserts.push({
							key,
							value,
							...mapper.relations[key]
						});
					}
				} else {
					acc.thisTable.push({key, value});
				}
			} else {
				acc.thisTable.push({key, value});
			}
			return acc;
		},
		{
			thisTable: [],
			joinInserts: [],
			otherTables: []
		}
	);

	const Q = ``;

	return `
WITH 
${
		values.joinInserts.length > 0
			? `${values.joinInserts.map((a, i) => {
					return `"SELECT${i}" AS (
	SELECT * FROM "${a.reference}"
	WHERE ${Object.keys(a.value).map(b => `"${b}" = ${parseValue(a.value[b])} `)
		.join(` AND 
	`)}
),

"INSERT${i}" AS (
	INSERT INTO "${a.reference}"
	(${Object.keys(a.value)
		.map(b => `"${b}"`)
		.join(', ')})
	SELECT ${Object.keys(a.value)
		.map(b => parseValue(a.value[b]))
		.join(', ')}
	WHERE NOT EXISTS (SELECT 1 FROM "SELECT${i}")
	RETURNING *
),

"JOIN${i}" AS (
	SELECT * FROM "SELECT${i}"
	UNION ALL
	SELECT * FROM "INSERT${i}"
)
`;
			  }).join(`,
`)}, 
`
			: ''
	}

"INS" AS (
	INSERT INTO "${mapper.name}"
		(${values.thisTable.map(a => `"${a.key}"`).join(', ')}${
		values.joinInserts.length > 0
			? `, ${values.joinInserts.map(a => `"${a.key}"`).join(', ')}`
			: ''
	})
	${
		values.joinInserts.length > 0 ? 'SELECT ' : 'VALUES ('
	} ${values.thisTable.map(a => parseValue(a.value)).join(', ')}${
		values.joinInserts.length > 0
			? `, ${values.joinInserts.map((a, i) => `"JOIN${i}".id`).join(', ')}`
			: ')'
	}
	${
		values.joinInserts.length > 0
			? `FROM ${values.joinInserts.map((a, i) => `"JOIN${i}"`).join(', ')}`
			: ''
	}
	RETURNING *
) 
SELECT "INS".* ${
		values.joinInserts.length > 0
			? `, ${values.joinInserts
					.map((a, i) => `row_to_json("JOIN${i}".*) AS "${a.key}"`)
					.join(', ')}`
			: ''
	}
FROM "INS" ${
		values.joinInserts.length > 0
			? `, ${values.joinInserts.map((a, i) => `"JOIN${i}"`).join(`, 
`)}`
			: ''
	} 
;
`;
};

const queryFind = (mapper, entry) => {
	return `SELECT * FROM "${mapper.name}"
WHERE ${Object.keys(entry).map(a => `"${a}" = ${parseValue(entry[a])}`)
		.join(` AND
`)};`;
};

const queryUpdate = (mapper, condition, entry) => {
	const values = require('lodash/reduce')(
		entry,
		(acc, value, key) => {
			if (
				mapper.properties[key] === 'defaultRelation' ||
				mapper.properties[key] === 'manyToMany'
			) {
				acc.otherTables.push({
					key,
					value,
					...mapper.relations[key]
				});
			} else if (
				mapper.properties[key] === 'manyToOne' ||
				mapper.properties[key] === 'joinToOne' ||
				mapper.properties[key] === 'joinToJoin'
			) {
				if (typeof value === 'object') {
					if (value.id) {
						acc.thisTable.push({key, value: value.id});
					} else {
						acc.joinInserts.push({
							key,
							value,
							...mapper.relations[key]
						});
					}
				} else {
					acc.thisTable.push({key, value});
				}
			} else {
				acc.thisTable.push({key, value});
			}
			return acc;
		},
		{
			thisTable: [],
			joinInserts: [],
			otherTables: []
		}
	);
	return `
UPDATE "${mapper.name}"
SET	${values.thisTable.map(a => {
		return `"${a.key}" = ${parseValue(a.value)}`;
	}).join(`,
	`)}
WHERE ${Object.keys(condition).map(a => {
		return `"${mapper.name}"."${a}" = ${parseValue(condition[a])}`;
	}).join(` AND
	`)}
RETURNING *;
`;
};

const getStandardType = udtName => {
	const input = udtName
		.split('')
		.filter(c => c !== '_')
		.join('')
		.toLowerCase();
	switch (input) {
		case 'int4':
			return 'integer';
		case 'timestamptz':
		case 'timestamp':
			return 'datetime';
		case 'boolean':
		case 'bool':
			return 'boolean';
		case 'character varying':
		case 'string':
		case 'text':
		case 'character':
		case 'varchar':
		case 'char':
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
	if (typeof value === 'string') return `'${value.replace("'", "''")}'`;
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
	insertMany,
	updateOne,
	updateMany,
	find,
	findOne
};
