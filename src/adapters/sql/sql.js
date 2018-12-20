exports.testConnection = {
	sqlite: res => {
		return res[0].result === 2;
	},
	postgres: res => {
		return res.rows[0].result === 2;
	}
};

exports.getTables = {
	async sqlite() {
		const res = await this.raw(`SELECT name
FROM sqlite_master
WHERE type='table'
ORDER BY name
`);
		return res;
	},
	async postgres() {
		const results = await this.raw(`SELECT 
table_name AS name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
${this.pgSchema ? `AND table_schema = '${this.pgSchema}'` : ''}
AND table_schema NOT IN ('pg_catalog', 'information_schema');`);
		return results.rows.map(row => row.name);
	}
};

exports.getColumns = {
	sqlite: async (tableName, raw) => {
		const columns = await raw(`PRAGMA table_info('${tableName}')`);
		const res = columns.map(column => ({
			name: column.name,
			datatype: column.type.split('(')[0],
			nullable: column.notnull === 0 ? 'YES' : 'NO',
			primary: column.pk === 1,
			defaultValue: column.dflt_value
		}));
		return res;
	},
	postgres: async (tableName, raw, pgSchema) => {
		const res = await raw(`SELECT
c.column_name AS name, 
c.is_nullable AS nullable, 
c.data_type AS datatype,
c.character_maximum_length AS length
FROM  information_schema.columns c
WHERE c.table_name = '${tableName}'
${pgSchema ? `AND table_schema = '${pgSchema}'` : ''}
`);
		return res.rows;
	}
};

exports.getForeigns = {
	sqlite: async (tableName, raw) => {
		const foreigns = await raw(`PRAGMA foreign_key_list(${tableName})`);
		return foreigns;
	},
	postgres: async (tableName, raw) => {
		const {rows} = await raw(`SELECT 
    i.CONSTRAINT_NAME, k.COLUMN_NAME as "foreigns"
    FROM information_schema.TABLE_CONSTRAINTS i
    LEFT JOIN information_schema.KEY_COLUMN_USAGE k 
        ON i.CONSTRAINT_NAME = k.CONSTRAINT_NAME 
    WHERE i.CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND i.TABLE_NAME = '${tableName}';`);
		return rows.map(a => a.foreigns);
	}
};

exports.groupConcat = {
	postgres: (tableName, key, value = 'id') =>
		`ARRAY_AGG("${tableName}".${value}) AS "${key}"`
};
