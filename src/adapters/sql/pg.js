const testConnection = (res) => {
    return res.rows[0].result === 2
}

async function getTables() {
    const results = await this.raw(`SELECT 
table_name AS name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
${this.pgSchema ? `AND table_schema = '${this.pgSchema}'` : ""}
AND table_schema NOT IN ('pg_catalog', 'information_schema');`)
    return results.rows.map(row => row.name)
}

async function getColumns(tableName) {
    const res = await this.raw(`SELECT
    c.column_name AS name, 
    c.is_nullable AS nullable, 
    c.data_type AS datatype,
    c.character_maximum_length AS length
FROM  information_schema.columns c
WHERE c.table_name = '${tableName}'
${this.pgSchema ? `AND table_schema = '${this.pgSchema}'` : ""}
`)
    return res.rows
}

async function getForeigns(tableName) {
    const { rows } = await this.raw(`SELECT 
    i.CONSTRAINT_NAME, k.COLUMN_NAME as "foreigns"
    FROM information_schema.TABLE_CONSTRAINTS i
    LEFT JOIN information_schema.KEY_COLUMN_USAGE k 
        ON i.CONSTRAINT_NAME = k.CONSTRAINT_NAME 
    WHERE i.CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND i.TABLE_NAME = '${tableName}';`)
    return rows.map(a => a.foreigns)
}

module.exports = {
    testConnection,
    getTables,
    getColumns,
    getForeigns
}