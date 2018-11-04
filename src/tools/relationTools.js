async function isValidRelation(relationObject) {

}

async function addRelation() {
	console.log(this);
}
function joinToJoinRelation(raw_relation, name) {
	const column = {
		name,
		required: false,
		unique: false,
		index: false,
		defaultValue: undefined,
		isEnum: false,
		array: false,
		maxLength: 254,
		type: 'relation',
		reference: raw_relation.reference
	};

	const tables = [raw_relation.reference, this.name].sort();

	const relation = {
		reference: raw_relation.reference,
		table_1: tables[0],
		table_2: tables[1],
		targetColumn: 'id',
		type: 'join-to-join'
	};

	this.relations[name] = relation;
	this.properties[name] = 'joinToJoin';
	this.columns[name] = column;
}

function joinToOneRelation(raw_relation, name) {
	const column = {
		name,
		required: false,
		unique: false,
		index: false,
		defaultValue: undefined,
		isEnum: false,
		array: false,
		maxLength: 254,
		type: 'relation',
		reference: raw_relation.reference
	};

	const relation = {
		reference: raw_relation.reference,
		targetColumn: 'id',
		type: 'join-to-one',
		ownerTable: this.name,
		referencedTable: raw_relation.reference
	};

	this.relations[name] = relation;
	this.properties[name] = 'joinToOne';
	this.columns[name] = column;
}

function oneToJoinRelation(raw_relation, name) {
	const relation = {
		reference: raw_relation.reference,
		targetColumn: 'id',
		type: 'one-to-join',
		ownerTable: raw_relation.reference,
		referencedTable: this.name

	};

	this.relations[name] = relation;
	this.properties[name] = 'oneToJoin';
}

function manyToOneRelation(raw_relation, name) {
	const column = {
		name,
		required: false,
		unique: false,
		index: false,
		defaultValue: undefined,
		isEnum: false,
		array: false,
		maxLength: 254,
		type: 'relation',
		reference: raw_relation.reference
	};

	const relation = {
		reference: raw_relation.reference,
		targetColumn: 'id',
		type: 'many-to-one',
		ownerTable: this.name,
		referencedTable: raw_relation.reference
	};

	this.relations[name] = relation;
	this.properties[name] = 'manyToOne';
	this.columns[name] = column;
}

function oneToManyRelation(raw_relation, name) {
	const relation = {
		reference: raw_relation.reference,
		targetColumn: 'id',
		type: 'one-to-many',
		ownerTable: raw_relation.reference,
		referencedTable: this.name
	};

	this.relations[name] = relation;
	this.properties[name] = 'oneToMany';
}

function manyToManyRelation(raw_relation, name) {
	const tableName = this.name;
	const sortedTables = [raw_relation.reference, tableName].sort();
	const targetTable = `relation_${sortedTables.join('_')}`;

	const relation = {
		reference: raw_relation.reference,
		column_1: sortedTables[0],
		column_2: sortedTables[1],
		targetTable,
		type: 'many-to-many'
	};

	this.relations[name] = relation;
	this.properties[name] = 'manyToMany';
}

function defaultRelation(raw_relation, name) {
	const tableName = this.name;
	const sortedTables = [raw_relation.reference, tableName].sort();
	const targetTable = `relation_${sortedTables.join('_')}`;

	const relation = {
		reference: raw_relation.reference,
		column_1: sortedTables[0],
		column_2: sortedTables[1],
		targetTable,
		type: 'defaultRelation'
	};

	this.relations[name] = relation;
	this.properties[name] = 'defaultRelation';
}

export {
	isValidRelation,
	addRelation,
	joinToJoinRelation,
	joinToOneRelation,
	oneToJoinRelation,
	oneToManyRelation,
	manyToOneRelation,
	manyToManyRelation,
	defaultRelation
};
