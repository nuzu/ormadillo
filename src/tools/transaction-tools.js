async function insertOne(entry, insertOptions) {
	try {
		const {connection} = this;
		if (!connection) {
			throw new Error('No connection');
		}
		const [query, queryOptions] = await beforeInsert.call(
			this,
			entry,
			insertOptions
		);
		const record = await connection._tools.insertOne.call(
			this,
			query,
			queryOptions
		);
		const item = await afterInsert.call(this, record, queryOptions);
		return {
			success: true,
			error: null,
			item,
			items: [item],
			count: 1
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function insertMany(entries, insertOptions) {
	try {
		const Mapper = this;
		const {connection} = this;
		if (!connection) {
			throw new Error('No connection');
		}
		if (!Array.isArray(entries)) {
			entries = [entries];
		}
		const items0 = await connection._tools.insertMany.call(
			this,
			entries,
			insertOptions
		);
		const items = items0.map(each => new Mapper(each));
		return {
			success: true,
			error: null,
			item: items[0],
			items,
			count: items.length
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function find(entry, findOptions) {
	try {
		const Mapper = this;
		const {connection} = this;
		if (!connection) {
			throw new Error('No connection');
		}
		const items0 = await connection._tools.find.call(this, entry, findOptions);
		const items = items0.map(each => new Mapper(each));
		return {
			success: true,
			error: null,
			item: items[0],
			items,
			count: items.length
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function findOne(entry, findOptions) {
	try {
		const Mapper = this;
		const {connection} = this;
		if (!connection) {
			throw new Error('No connection');
		}
		const record = await connection._tools.findOne.call(
			this,
			entry,
			findOptions
		);
		if (record) {
			const item = new Mapper(record);
			return {
				success: true,
				error: null,
				item,
				count: 1,
				items: [item]
			};
		}
		return {
			success: false,
			error: 'No record',
			count: 0,
			items: [],
			item: null
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function updateOne(selector, values, updateOptions) {
	try {
		const Mapper = this;
		const connection = this.connection || this.$mapper.connection;
		if (!connection) {
			throw new Error('No connection');
		}
		const item0 = await connection._tools.updateOne.call(
			this,
			selector,
			values,
			updateOptions
		);
		const item = new Mapper(item0);
		return {
			success: true,
			error: null,
			item,
			count: 1,
			items: [item]
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function updateMany(selectorsArray, updatedValues, updateOptions) {
	try {
		const connection = this.connection || this.$mapper.connection;
		if (!connection) {
			throw new Error('No connection');
		}
		const items = await connection._tools.updateMany.call(
			this,
			selectorsArray,
			updatedValues,
			updateOptions
		);
		return {
			success: true,
			error: null,
			item: items[0],
			items,
			count: items.length
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function deleteOne(selector, deleteOptions) {
	try {
		const connection = this.connection || this.$mapper.connection;
		if (!connection) {
			throw 'No connection';
		}
		const item = await connection._tools.deleteOne.call(
			this,
			selector,
			deleteOptions
		);
		return {
			success: true,
			error: null,
			item,
			items: [item],
			count: 1
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function deleteMany(selectors, deleteOptions) {
	try {
		const connection = this.connection || this.$mapper.connection;
		if (!connection) {
			throw new Error('No connection');
		}
		const items = await connection._tools.deleteMany.call(
			this,
			selectors,
			deleteOptions
		);

		return {
			success: true,
			error: null,
			item: items[0],
			items,
			count: items.length
		};
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function beforeInsert(entry, options) {
	const {timestamps, uuid, short} = this.modelOptions;
	const {relations} = this;
	if (uuid) {
		entry = addUuid(entry);
	}
	if (short) {
		entry = addShort(entry);
	}
	if (timestamps) {
		entry = addTimestamps(entry);
	}
	entry = await require('./mapper-tools').default.validate.call(this, entry, {
		isValid: false
	});

	return [entry, options];
}

async function afterInsert(entry) {
	const Mapper = this;
	const item = new Mapper(entry);
	return item;
}

function addUuid(entry, options) {
	let uuid = 'uuid';
	if (options.uuidLabel && typeof options.uuidLabel === 'string')
		uuid = options.uuidLabel;
	entry[uuid] = require('uuid/v4')();
	return entry;
}

function addShort(entry, options) {
	let short = 'short';
	if (options.shortLabel && typeof options.shortLabel === 'string')
		short = options.shortLabel;
	entry[short] = require('shortid').generate();
	return entry;
}

function addTimestamps(entry) {
	entry.createdAt = new Date();
	entry.updatedAt = new Date();
	return entry;
}

/**
 * This adds OR finds the relations that need to be inserted OR found
 * before the parent entry is inserted into the database
 */
function relateBefore(entry) {}

export default {
	insertOne,
	insertMany,
	find,
	findOne,
	updateOne,
	updateMany,
	deleteOne,
	deleteMany
};
