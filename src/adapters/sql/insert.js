async function insertOne(entry, options) {
	const client = this.connection.client;
	if (!client) {
		console.log('No client available');
	}
	const tableName = this.name;
	const {arrays, parsedEntry, relations} = parseInsertEntry.call(this, entry);
	let row;
	for (const key in relations.joinColumn) {
		parsedEntry[key] = await insertJoinColumnRelations.call(this, relations.joinColumn[key]);
	}
	const isEmpty = require('lodash/isEmpty');
	if (!isEmpty(parsedEntry)) {
		[row] = await client(tableName)
			.insert(parsedEntry)
			.returning('*');
	}
	await insertArrays.call(this, arrays, row.id);
	for (const key in relations.joinTable) {
		await insertJoinTableRelations.call(this, relations.joinTable[key], row.id);
	}

	const [item] = await require('./find').populate.call(this, [row]);
	// Const [item] = rows
	return item;
}

async function insertMany(entries, options) {
	const client = this.connection.client;
	if (!client) {
		console.log('No client available');
	}
	const items = Promise.all(entries.map(async entry => {
		const item = await insertOne.call(this, entry, options);
		return item;
	}));

	return items;
}

function parseInsertEntry(entry, options) {
	const arrays = this.arrays;
	const columns = this.columns;
	const properties = this.properties;
	const tableName = this.name;
	const relations = this.relations;
	const reduce = require('lodash/reduce');
	const parsedInput = reduce(entry, (acc, value, key) => {
		if (arrays.includes(key)) {
			const acceptedType = require('./types').getJavascriptType(columns[key].type);
			const obj = {};
			switch ((typeof value).toLowerCase()) {
				case 'object':
					if (Array.isArray(value)) {
						obj.insert = value;
					}
					break;
				case acceptedType:
					obj.insert = [value];
					break;
			}
			acc.arrays.push({
				name: key,
				arrayTableName: `array_${tableName}_${key}`,
				...obj
			});
		} else if (properties[key] === 'defaultRelation' || properties[key] === 'manyToMany') {
			acc.relations.joinTable[key] = relations[key];
			acc.relations.joinTable[key].value = value;
		} else if (properties[key] === 'joinToOne' || properties[key] === 'joinToJoin' || properties[key] === 'manyToOne') {
			if (typeof value === 'object') {
				if (value.id) {
					acc.parsedEntry[key] = value.id;
				}
			} else {
				acc.parsedEntry[key] = value;
			}
		} else {
			if (key === 'author') {
				console.log(properties[key]);
			}
			acc.parsedEntry[key] = value;
		}
		return acc;
	}, {
		arrays: [],
		relations: {
			joinTable: {},
			joinColumn: {},
			createFirst: {}
		},
		parsedEntry: {},
		insertIntoTable: {}
	});
	return parsedInput;
}

async function insertArrays(arrays, id) {
	const client = this.connection.client;
	await Promise.all(arrays.map(async array => {
		if (array.insert) {
			await client(array.arrayTableName)
				.insert(array.insert.map(each => ({
					key: id,
					value: each
				})));
		}
	}));
}

async function insertIntoRelationsTables(relation, rowNumber) {
	const client = this.connection.client;
	if (typeof relation.value === 'object') {
		if (relation.value.id) {
			relation.value = relation.value.id;
			insertIntoRelationsTables.call(this, relation, rowNumber);
		} else {
			let childTable = relation.column_1;
			if (relation.column_1 === this.name) {
				childTable = relation.column_2;
			}
			const childRelation = await client(childTable)
				.insert(relation.value)
				.returning('id');
			console.log(childRelation);
		}
	} else {
		const insertValue = {};
		if (relation.column_1 === this.name) {
			insertValue[`${relation.column_1}_id`] = rowNumber;
			insertValue[`${relation.column_2}_id`] = relation.value;
		} else if (relation.column_2 === this.name) {
			insertValue[`${relation.column_2}_id`] = rowNumber;
			insertValue[`${relation.column_1}_id`] = relation.value;
		}
		await client(relation.targetTable)
			.insert(insertValue);
	}
}

async function insertJoinTableRelations(relation, rowNumber) {
	const client = this.connection.client;
	if (typeof relation.value === 'object') {

	} else {
		const insertValue = {};
		if (relation.column_1 === this.name) {
			insertValue[`${relation.column_1}_id`] = rowNumber;
			insertValue[`${relation.column_2}_id`] = relation.value;
		} else if (relation.column_2 === this.name) {
			insertValue[`${relation.column_2}_id`] = rowNumber;
			insertValue[`${relation.column_1}_id`] = relation.value;
		}
		await client(relation.targetTable)
			.insert(insertValue);
	}
}

async function insertJoinColumnRelations(relation) {
	const knex = this.connection.client;
	if (typeof relation.value === 'object') {

	} else {
		return relation.value;
	}
}

async function updateOne(selector, values, options) {
	const client = this.connection.client;
	if (!client) {
		console.log('No client available');
	}
	const tableName = this.name;
	const {arrays, parsedEntry, relations} = parseInsertEntry.call(this, values);
	let rows = [];
	const isEmpty = require('lodash/isEmpty');
	if (!isEmpty(parsedEntry)) {
		rows = await client(tableName)
			.where(selector)
			.update(parsedEntry)
			.returning('*');
	} else {
		rows = await require('./find').find.call(this, selector);
		console.log(rows);
	}
	const [populatedRow] = await require('./find').populate.call(this, rows);
	return populatedRow;
}

async function updateMany(selectorsArray, updatedValues, options) {
	const items = await Promise.all(selectorsArray.map(async selector => {
		const {item} = await updateOne.call(this, selector, updatedValues, options);
		return item;
	}));
	return items;
}

module.exports = {
	insertOne,
	insertMany,
	parseInsertEntry,
	insertArrays,
	insertJoinTableRelations,
	updateOne,
	updateMany
};
