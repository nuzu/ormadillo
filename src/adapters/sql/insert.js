async function insertOne(entry, options) {
	const {client} = this.connection;
	if (!client) throw require('./error').NO_CLIENT;
	const tableName = this.name;
	const {
		arrays,
		parsedEntry,
		relations,
		parsedOptions
	} = await parseInsertEntry.call(this, entry);
	let row;
	/* eslint-disable no-await-in-loop */
	for (const key in relations.joinColumn) {
		if ({}.hasOwnProperty.call(relations.joinColumn, key)) {
			parsedEntry[key] = await insertJoinColumnRelations.call(
				this,
				relations.joinColumn[key]
			);
		}
	}
	/* eslint-enable no-await-in-loop */
	const isEmpty = require('lodash/isEmpty');
	const returning = parsedOptions.returning ? parsedOptions.returning : '*';
	if (!isEmpty(parsedEntry)) {
		[row] = await client(tableName)
			.insert(parsedEntry)
			.returning(returning);
	}
	await insertArrays.call(this, arrays, row.id);
	/* eslint-disable no-await-in-loop */
	for (const key in relations.joinTable) {
		if ({}.hasOwnProperty.call(relations.joinTable, key)) {
			await insertJoinTableRelations.call(
				this,
				relations.joinTable[key],
				row.id
			);
		}
	}
	/* eslint-enable no-await-in-loop */

	const [item] = await require('./find').populate.call(this, [row]);
	// Const [item] = rows
	return item;
}

async function insertMany(entries, options) {
	const {client} = this.connection;
	if (!client) throw require('./error').NO_CLIENT;
	const items = await Promise.all(
		entries.map(async entry => {
			const item = await insertOne.call(this, entry, options);
			return item;
		})
	);

	return items;
}

async function parseInsertEntry(entry, options) {
	const {arrays, columns, properties, relations, connection} = this;
	const tableName = this.name;
	const reduce = require('lodash/reduce');
	const parsedInput = await reduce(
		entry,
		async (accPromise, value, key) => {
			const acc = await accPromise;
			if (arrays.includes(key)) {
				const acceptedType = require('./types').getJavascriptType(
					columns[key].type
				);
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
				if (typeof value === 'object') {
					if (value.id) {
						acc.parsedEntry[key] = value.id;
					} else {
						const {id} = await findOrCreateOne.call(
							connection,
							relations[key].reference,
							value
						);
						acc.parsedEntry[key] = id;
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
		},
		Promise.resolve({
			arrays: [],
			relations: {
				joinTable: {},
				joinColumn: {}
			},
			parsedEntry: {},
			insertIntoTable: {},
			parsedOptions: {
				...options
			}
		})
	);
	return parsedInput;
}

async function findOrCreateOne(tableName, value) {
	const {client, repository} = this;
	if (value.returnObject) {
		value = value.returnObject();
	}
	const res = await client
		.from(tableName)
		.select('*')
		.returning('*')
		.where(value);
	if (res.length > 0) {
		return res[0];
	}
	const newInsert = await insertOne.call(repository[tableName], value);
	return newInsert;
}

async function insertArrays(arrays, id) {
	const {client} = this.connection;
	await Promise.all(
		arrays.map(async array => {
			if (array.insert) {
				await client(array.arrayTableName).insert(
					array.insert.map(each => ({
						key: id,
						value: each
					}))
				);
			}
		})
	);
}

async function insertIntoRelationsTables(relation, rowNumber) {
	const {client} = this.connection;
	if (typeof relation.value === 'object') {
		if (relation.value.id) {
			relation.value = relation.value.id;
			insertIntoRelationsTables.call(this, relation, rowNumber);
		} else {
			let childTable = relation.column1;
			if (relation.column1 === this.name) {
				childTable = relation.column2;
			}
			const childRelation = await client(childTable)
				.insert(relation.value)
				.returning('id');
			console.log(childRelation);
		}
	} else {
		const insertValue = {};
		if (relation.column1 === this.name) {
			insertValue[`${relation.column1}_id`] = rowNumber;
			insertValue[`${relation.column2}_id`] = relation.value;
		} else if (relation.column2 === this.name) {
			insertValue[`${relation.column2}_id`] = rowNumber;
			insertValue[`${relation.column1}_id`] = relation.value;
		}
		await client(relation.targetTable).insert(insertValue);
	}
}

async function insertJoinTableRelations(relation, rowNumber) {
	const {client} = this.connection;
	/// if relation.value is an Array ?
	if (typeof relation.value === 'object') {
		let insertValue;
		if (Array.isArray(relation.value)) {
			insertValue = await Promise.all(
				relation.value.map(async each => {
					const eachInsertValue = {};
					if (relation.column1 === this.name) {
						const column2value = await findOrCreateOne.call(
							this.connection,
							relation.column2,
							each
						);
						eachInsertValue[`${relation.column1}_id`] = rowNumber;
						eachInsertValue[`${relation.column2}_id`] = column2value.id;
					} else if (relation.column2 === this.name) {
						const column1value = await findOrCreateOne.call(
							this.connection,
							relation.column1,
							relation.value
						);
						eachInsertValue[`${relation.column2}_id`] = rowNumber;
						eachInsertValue[`${relation.column1}_id`] = column1value.id;
					}
					return eachInsertValue;
				})
			);
			await client(relation.targetTable).insert(insertValue);
		} else {
			insertValue = {};
			if (relation.column1 === this.name) {
				const column2value = await findOrCreateOne.call(
					this.connection,
					relation.column2,
					relation.value
				);
				insertValue[`${relation.column1}_id`] = rowNumber;
				insertValue[`${relation.column2}_id`] = column2value.id;
			} else if (relation.column2 === this.name) {
				const column1value = await findOrCreateOne.call(
					this.connection,
					relation.column1,
					relation.value
				);
				insertValue[`${relation.column2}_id`] = rowNumber;
				insertValue[`${relation.column1}_id`] = column1value.id;
			}
			await client(relation.targetTable).insert(insertValue);
		}
	} else {
		const insertValue = {};
		if (relation.column1 === this.name) {
			insertValue[`${relation.column1}_id`] = rowNumber;
			insertValue[`${relation.column2}_id`] = relation.value;
		} else if (relation.column2 === this.name) {
			insertValue[`${relation.column2}_id`] = rowNumber;
			insertValue[`${relation.column1}_id`] = relation.value;
		}
		await client(relation.targetTable).insert(insertValue);
	}
}

async function insertJoinColumnRelations(relation) {
	const {client} = this.connection;
	if (typeof relation.value === 'object') {
	} else {
		return relation.value;
	}
}

async function updateOne(selector, values, options) {
	const {client} = this.connection;
	if (!client) {
		console.log('No client available');
	}
	const tableName = this.name;
	const {arrays, parsedEntry, relations} = await parseInsertEntry.call(
		this,
		values
	);
	let rows = [];
	const isEmpty = require('lodash/isEmpty');
	if (isEmpty(parsedEntry)) {
		rows = await require('./find').find.call(this, selector);
		console.log(rows);
	} else {
		rows = await client(tableName)
			.where(selector)
			.update(parsedEntry)
			.returning('*');
	}
	const [populatedRow] = await require('./find').populate.call(this, rows);
	return populatedRow;
}

async function updateMany(selectorsArray, updatedValues, options) {
	const items = await Promise.all(
		selectorsArray.map(async selector => {
			const {item} = await updateOne.call(
				this,
				selector,
				updatedValues,
				options
			);
			return item;
		})
	);
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
