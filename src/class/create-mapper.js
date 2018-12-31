import $tt from '../tools/transaction-tools';
import createSchema from './create-validation-schema';

const createMapper = (model, connection) => {
	class Mapper {
		constructor(rawEntry) {
			Object.assign(this, rawEntry);
		}

		async validate(entry, options = {isValid: true}, cb) {
			try {
				let validationSchema;
				if (entry && entry !== '') {
					({validationSchema} = this);
				} else {
					const {...rest} = this;
					({validationSchema} = this.constructor);
					if (rest) {
						entry = rest;
					}
				}
				if (typeof entry !== 'object') {
					throw new TypeError(
						'Unable to identify variable which is not an object.'
					);
				}
				const res = validationSchema.validateSync(entry, {strict: true});
				if (options.isValid) {
					return true;
				}
				if (cb) {
					return cb(null, res);
				}
				return res;
			} catch (error) {
				console.log(`ERROR: ${error.message}`);
				return false;
			}
		}

		async save() {
			try {
				const {...entry} = this;
				const Mapper = this.constructor;
				let res;
				if (entry[Mapper.primary]) {
					// Could do it for any unique value
					const selector = {
						[Mapper.primary]: entry[this.constructor.primary]
					};

					res = await Mapper.updateOne(selector, entry);
				} else {
					res = await Mapper.insertOne(entry);
				}
				if (res.item) {
					Object.assign(this, res.item);
				}
				return res.item;
			} catch (error) {
				console.log(error);
				return false;
			}
		}

		returnObject() {
			const {...rest} = this;
			return rest;
		}

		static async insertOne(entry, insertOptions) {
			try {
				const {modelOptions, connection} = this;
				const Mapper = this;
				if (modelOptions.timestamps) {
					entry.createdAt = new Date();
					entry.updatedAt = new Date();
				}
				if (modelOptions.uuid) {
					const uuid = modelOptions.uuid.label || 'uuid';
					entry[uuid] = require('uuid/v4')();
				}
				if (modelOptions.short) {
					const short = modelOptions.short.label || 'short';
					entry[short] = require('shortid').generate();
				}
				const query = await this.prototype.validate.call(this, entry, {
					isValid: false,
					type: 'insert'
				});
				if (!query) throw new Error('Unable to validate');
				const record = await connection.tools.insertOne.call(
					this,
					query,
					insertOptions
				);
				const item = new Mapper(record);
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

		static async insertMany(entries, insertOptions) {
			try {
				const Mapper = this;
				if (!Array.isArray(entries)) {
					entries = [entries];
				}
				const items0 = await this.connection.tools.insertMany.call(
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

		static async find(entry, findOptions) {
			try {
				const Mapper = this;
				const items0 = await this.connection.tools.find.call(
					this,
					entry,
					findOptions
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

		static async findOne(entry, findOptions) {
			try {
				const Mapper = this;
				const record = await this.connection.tools.findOne.call(
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

		static async updateOne(selector, values, updateOptions) {
			try {
				const Mapper = this;
				const item0 = await this.connection.tools.updateOne.call(
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

		static async updateMany(updateArray, updateOptions) {
			try {
				const Mapper = this;
				const res = await this.connection.tools.updateMany.call(
					this,
					updateArray,
					updateOptions
				);
				const items = res.map(a => new Mapper(a));
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

		static async deleteOne(selector, deleteOptions) {
			const res = await $tt.deleteOne.call(this, selector, deleteOptions);
			return res;
		}

		static async deleteMany(selectors, deleteOptions) {
			const res = await $tt.deleteMany.call(this, selectors, deleteOptions);
			return res;
		}
	}
	configMapper.call(Mapper, model, connection);
	return Mapper;
};

function configMapper(model, connection) {
	Object.defineProperty(this, 'name', {value: model.name});
	this.connection = connection;
	this.raw_properties = model.properties;
	this.modelOptions = model.options || {};
	this.events = model.events || {};
	this.methods = model.methods || {};
	this.requireds = [];
	this.uniques = [];
	this.virtuals = {};
	this.enums = {};
	this.properties = {};
	this.relations = {};
	this.columns = {};
	this.indices = [];
	this.arrays = [];
	this.primary = 'id';
	parseProperties.call(this);
	this.validationSchema = createSchema.call(this);
}

function parseProperties() {
	const rawProps = this.raw_properties;
	this.idTaken = false;

	for (const key in rawProps) {
		if ({}.hasOwnProperty.call(rawProps, key)) {
			sortIntoType.call(this, key, rawProps[key]);
		}
	}
	if (!this.idTaken) {
		addIDProperty.call(this, this.primary);
	}
	if (this.modelOptions.timestamps) {
		addTimeStampProperties.call(this);
	}
}

function addTimeStampProperties() {
	const columns = {
		createdAt: {
			name: 'createdAt',
			type: 'datetime',
			required: false,
			unique: false,
			// DefaultValue: require('moment')().format('YYYY-MM-DD HH:mm:ss'),
			isEnum: false,
			array: false
		},
		updatedAt: {
			name: 'updatedAt',
			type: 'datetime',
			required: false,
			unique: false,
			// DefaultValue: require('moment')().format('YYYY-MM-DD HH:mm:ss'),
			isEnum: false,
			array: false
		}
	};

	Object.assign(this.properties, {
		createdAt: 'columns',
		updatedAt: 'columns'
	});
	Object.assign(this.columns, columns);
}

function addIDProperty(name) {
	const property = {
		name,
		type: 'id',
		required: true,
		unique: true,
		index: true,
		defaultValue: undefined,
		isEnum: false,
		array: false
	};
	this.requireds.push(name);
	this.uniques.push(name);
	this.properties[name] = 'columns';
	this.columns[name] = property;
	return property;
}

function parseProperty(rawProp, name) {
	const property = {
		name,
		required: false,
		unique: false,
		index: false,
		defaultValue: undefined,
		isEnum: false,
		array: false,
		maxLength: 254
	};
	property.type = parsePropType(rawProp.type);

	// @todo: better selection to allow for custom error messages
	if (rawProp.required) {
		this.requireds.push(name);
		property.required = true;
	}
	if (rawProp.unique) {
		this.uniques.push(name);
		property.unique = true;
	}
	if (rawProp.index) {
		this.indices.push(name);
		property.index = true;
	}

	if (property.type === 'virtual') {
		property.virtualFn = rawProp.function;
		this.virtuals.push(name);
	}

	if (property.type === 'enum') {
		property.isEnum = true;
	}
	if (rawProp.array) {
		this.arrays.push(name);
		property.array = true;
	}

	if ({}.hasOwnProperty.call(rawProp, 'defaultValue')) {
		property.defaultValue = rawProp.defaultValue;
	}
	if ({}.hasOwnProperty.call(rawProp, 'length')) {
		property.maxLength = rawProp.maxLength;
	}

	return property;
}

function parsePropType(type) {
	switch (type.toLowerCase()) {
		case 'string':
			return 'string';
		case 'virtual':
			return 'virtual';
		case 'boolean':
			return 'boolean';
		default:
			return 'string';
	}
}

function parseRelation(rawRelation, name) {
	let sortedTables;
	const relationType = rawRelation.relation || '';
	switch (relationType.toLowerCase()) {
		case 'one-to-one':
		case 'join-to-join':
			this.relations[name] = {
				reference: rawRelation.reference,
				table1: [rawRelation.reference, this.name].sort()[0],
				table2: [rawRelation.reference, this.name].sort()[1],
				targetColumn: 'id',
				type: 'join-to-join',
				inverse: rawRelation.inverse || this.name.toLowerCase()
			};
			this.properties[name] = 'joinToJoin';
			this.columns[name] = {
				name,
				required: false,
				unique: false,
				index: false,
				defaultValue: undefined,
				isEnum: false,
				array: false,
				maxLength: 254,
				type: 'relation',
				reference: rawRelation.reference
			};
			break;
		case 'join-to-one':
			this.relations[name] = {
				reference: rawRelation.reference,
				targetColumn: 'id',
				type: 'join-to-one',
				ownerTable: this.name,
				referencedTable: rawRelation.reference,
				inverse: rawRelation.inverse || this.name.toLowerCase()
			};
			this.properties[name] = 'joinToOne';
			this.columns[name] = {
				name,
				required: false,
				unique: false,
				index: false,
				defaultValue: undefined,
				isEnum: false,
				array: false,
				maxLength: 254,
				type: 'relation',
				reference: rawRelation.reference
			};
			break;
		case 'one-to-join':
			this.relations[name] = {
				reference: rawRelation.reference,
				targetColumn: 'id',
				type: 'one-to-join',
				ownerTable: rawRelation.reference,
				referencedTable: this.name,
				inverse: rawRelation.inverse
			};
			this.properties[name] = 'oneToJoin';
			break;
		case 'one-to-many':
			this.relations[name] = {
				reference: rawRelation.reference,
				targetColumn: 'id',
				type: 'one-to-many',
				ownerTable: rawRelation.reference,
				referencedTable: this.name
			};
			this.properties[name] = 'oneToMany';
			break;
		case 'many-to-one':
			this.relations[name] = {
				reference: rawRelation.reference,
				targetColumn: 'id',
				type: 'many-to-one',
				ownerTable: this.name,
				referencedTable: rawRelation.reference
			};
			this.properties[name] = 'manyToOne';
			this.columns[name] = {
				name,
				required: false,
				unique: false,
				index: false,
				defaultValue: undefined,
				isEnum: false,
				array: false,
				maxLength: 254,
				type: 'relation',
				reference: rawRelation.reference
			};
			break;
		case 'many-to-many':
			sortedTables = [rawRelation.reference, this.name].sort();
			this.relations[name] = {
				reference: rawRelation.reference,
				table1: sortedTables[0],
				table2: sortedTables[1],
				column1:
					sortedTables[0] === this.name
						? name
						: rawRelation.inverse || this.name.toLowerCase(),
				column2:
					sortedTables[1] === this.name
						? name
						: rawRelation.inverse || this.name.toLowerCase(),
				targetTable: `relation_${sortedTables.join('_')}`,
				type: 'many-to-many'
			};
			this.properties[name] = 'manyToMany';
			break;
		default:
			sortedTables = [rawRelation.reference, this.name].sort();
			this.relations[name] = {
				reference: rawRelation.reference,
				column1: sortedTables[0],
				column2: sortedTables[1],
				targetTable: `relation_${sortedTables.join('_')}`,
				type: 'defaultRelation'
			};
			this.properties[name] = 'defaultRelation';
			break;
	}
}

function sortIntoType(name, value) {
	switch (value.type.toLowerCase()) {
		case 'string':
		case 'number':
		case 'int':
		case 'integer':
		case 'float':
		case 'boolean':
		case 'object':
		case 'json':
		case 'enum':
		case 'datetime':
		case 'timestamp':
		case 'date':
		case 'time':
		case 'id':
		case 'uuid':
			this.properties[name] = 'columns';
			this.columns[name] = parseProperty.call(this, value, name);
			break;
		case 'reference':
		case 'relation':
			parseRelation.call(this, value, name);
			break;
		case 'virtual':
			this.properties[name] = 'virtuals';
			this.virtuals[name] = parseVirtual.call(this, value, name);
			break;
		case 'embedded':
		default:
			console.log('unable to parse this ' + name);
	}
}

export default createMapper;
