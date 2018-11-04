async function find(entry, options) {
	const client = this.connection.client;
	if (!client) {
		console.log('No client available');
	}
	const tableName = this.name;
	const {parsedEntry, arrays} = parseFindEntry.call(this, entry);
	const rows = await client
		.from(tableName)
		.select('*')
		.where(parsedEntry)
		.returning('*');
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
	const arrays = this.arrays;
	const columns = this.columns;
	const properties = this.properties;
	const tableName = this.name;
	const relations = this.relations;
	const reduce = require('lodash/reduce');
	const parsedInput = reduce(entry, function (acc, value, key) {
		if (arrays.includes(key)) {
			const acceptedType = getJavascriptType(this.columns[key].type);
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
			acc.relations.joinColumn[key] = relations[key];
			acc.relations.joinColumn[key].value = value;
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
		parsedEntry: {}
	});
	return parsedInput;
}

async function populate(rows) {
	const arrays = this.arrays;
	const relations = this.relations;
	const client = this.connection.client;
	const populated_rows = await Promise.all(rows.map(async row => {
		await Promise.all(arrays.map(async array => {
			const arrayRecord = await client
				.from(`array_${this.name}_${array}`)
				.select('value')
				.where({key: row.id})
				.returning('*')
				.map(record => record.value);
			row[array] = arrayRecord;
		}));
		for (const key in relations) {
			const relation = relations[key];
			let relationRecord;
			switch (relation.type) {
				case 'many-to-many':
				case 'defaultRelation':
					let otherTable = relation.column_1;
					if (this.name === relation.column_1) {
						otherTable = realtion.column_2;
					}
					relationRecord = await client
						.select(`${otherTable}.*`)
						.from(relation.targetTable)
						.where({[`${this.name}_id`]: row.id})
						.join(otherTable, `${relation.targetTable}.${otherTable}_id`, `${otherTable}.id`);
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

		return row;
	}));

	// Console.log(populated_rows)
	return populated_rows;
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
	const items = await Promise.all(selectors.map(async selector => {
		const {item} = await this.deleteOne.call(this, selector, options);
		return item;
	}));
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
