async function find(entry, options) {
	const {client, dialect, raw} = this.connection;
	if (!client) {
		console.log('No client available');
	}
	const tableName = this.name;
	const {parsedEntry, arrays} = parseFindEntry.call(this, entry);
	const query = client
		.from(tableName)
		.select(`${tableName}.*`)
		.where(parsedEntry);
	if (this.arrays.length > 0) {
		this.arrays.map(array => {
			query
				.join(
					`array_${tableName}_${array}`,
					`array_${tableName}_${array}.key`,
					`${tableName}.id`
				)
				.select(
					raw(
						require('./sql').groupConcat[dialect](
							`array_${tableName}_${array}`,
							array,
							'value'
						)
					)
				);
		});
	}
	const relationKeys = Object.keys(this.relations);
	relationKeys.map(relKey => {
		const relation = this.relations[relKey];
		return;
		let otherTable;
		switch (relation.type) {
			case 'many-to-many':
			case 'defaultRelation':
				otherTable =
					relation.column1 === tableName ? relation.column2 : relation.column1;
				query
					.join(
						relation.targetTable,
						`${relation.targetTable}.${this.name}_id`,
						`${tableName}.id`
					)
					.join(
						otherTable,
						`${otherTable}.id`,
						`${relation.targetTable}.${otherTable}_id`
					)
					.select(
						raw(
							require('./sql').groupConcat[dialect](
								otherTable,
								`rel_${relKey}`,
								'id'
							)
						)
					);
				break;
			default:
				break;
		}
	});

	const rows = await query.groupBy(`${tableName}.id`).returning('*');
	if (arrays.length > 0) {
		findInArrays.call(this, arrays);
	}
	const populatedRows = await populate.call(this, rows);
	return populatedRows;
}

async function findOne(entry, options) {
	const rows = await find.call(this, entry, options);
	if (rows.length > 0) {
		return rows[0];
	}
	return false;
}

function parseFindEntry(entry, options) {
	const {arrays, columns, properties, relations} = this;
	const tableName = this.name;
	const reduce = require('lodash/reduce');
	if (Array.isArray(entry)) return {parsedEntry: entry};
	if (typeof entry === 'string' || typeof entry === 'number')
		return {
			parsedEntry: {[`${tableName}.id`]: entry},
			arrays: [],
			relations: {
				joinTable: {},
				joinColumn: {},
				createFirst: {}
			}
		};
	const parsedInput = reduce(
		entry,
		function(acc, value, key) {
			if (arrays.includes(key)) {
				const acceptedType = require('./types').getJavascriptType(
					this.columns[key].type
				);
				const obj = {};
				switch ((typeof value).toLowerCase()) {
					case 'object':
						if (Array.isArray(value)) {
							obj.insert = value;
						}
						break;
					case acceptedType:
						obj.includes = [value];
						break;
					default:
						break;
				}
				acc.arrays.push({
					name: key,
					arrayTableName: `array_${tableName}_${key}`,
					...obj
				});
			} else if (
				properties[key] === 'defaultRelation' ||
				properties[key] === 'manyToMany'
			) {
				acc.relations.joinTable[key] = relations[key];
				acc.relations.joinTable[key].value = value;
			} else if (
				properties[key] === 'joinToOne' ||
				properties[key] === 'joinToJoin' ||
				properties[key] === 'manyToOne'
			) {
				acc.relations.joinColumn[key] = relations[key];
				acc.relations.joinColumn[key].value = value;
			} else {
				if (key === 'author') {
					console.log(properties[key]);
				}
				acc.parsedEntry[key] = value;
			}
			return acc;
		},
		{
			arrays: [],
			relations: {
				joinTable: {},
				joinColumn: {},
				createFirst: {}
			},
			parsedEntry: {}
		}
	);
	return parsedInput;
}

async function findInArrays(arrays) {}

async function populate(rows) {
	const {
		relations,
		connection: {client},
		name
	} = this;
	const populatedRows = await Promise.all(
		rows.map(async row => {
			/* eslint-disable no-await-in-loop */
			for (const key in relations) {
				const relation = relations[key];
				let relationRecord;
				let otherTable = relation.column1;
				switch (relation.type) {
					case 'many-to-many':
					case 'defaultRelation':
						if (name === relation.column1) {
							otherTable = relation.column2;
						}
						relationRecord = await client
							.select(`${otherTable}.*`)
							.from(relation.targetTable)
							.where({[`${this.name}_id`]: row.id})
							.join(
								otherTable,
								`${relation.targetTable}.${otherTable}_id`,
								`${otherTable}.id`
							);
						console.log(relationRecord);
						row[key] = relationRecord;
						break;
					case 'one-to-one':
					case 'join-to-one':
					case 'join-to-join':
						[relationRecord] = await client
							.select('*')
							.from(relation.referencedTable)
							.where({id: row[key]});
						row[key] = relationRecord;
						break;
					case 'one-to-join':
						[relationRecord] = await client
							.select('*')
							.from(relation.ownerTable)
							.where({[this.name]: row.id});
						row[key] = relationRecord;
						break;
					case 'many-to-one':
						[relationRecord] = await client
							.select('*')
							.from(relation.referencedTable)
							.where({id: row[key]});
						row[key] = relationRecord;
						break;
					case 'one-to-many':
						relationRecord = await client
							.select('*')
							.from(relation.ownerTable)
							.where({[this.name]: row.id});
						row[key] = relationRecord;
						break;
					default:
						break;
				}
			}
			/* eslint-enable no-await-in-loop */
			return row;
		})
	);

	// Console.log(populated_rows)
	return populatedRows;
}

async function deleteOne(selector, options) {
	const client = this.connection.client;
	if (!client) {
		console.log('No client available');
	}
	const tableName = this.name;
	const [item] = await client(tableName)
		.where(selector)
		.del()
		.returning('*');
	return item;
}

async function deleteMany(selectors, options) {
	const items = await Promise.all(
		selectors.map(async selector => {
			const {item} = await this.deleteOne(selector, options);
			return item;
		})
	);
	return items;
}

module.exports = {
	find,
	findOne,
	parseFindEntry,
	populate,
	deleteOne,
	deleteMany
};
