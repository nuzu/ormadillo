async function isValidRelation(relationObject) {}

async function addRelation() {
	console.log(this);
}
function joinToJoinRelation(rawRelation, name) {
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
		reference: rawRelation.reference
	};

	const tables = [rawRelation.reference, this.name].sort();

	const relation = {
		reference: rawRelation.reference,
		table1: tables[0],
		table2: tables[1],
		targetColumn: 'id',
		type: 'join-to-join'
	};

	this.relations[name] = relation;
	this.properties[name] = 'joinToJoin';
	this.columns[name] = column;
}

function joinToOneRelation(rawRelation, name) {
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
		reference: rawRelation.reference
	};

	const relation = {
		reference: rawRelation.reference,
		targetColumn: 'id',
		type: 'join-to-one',
		ownerTable: this.name,
		referencedTable: rawRelation.reference
	};

	this.relations[name] = relation;
	this.properties[name] = 'joinToOne';
	this.columns[name] = column;
}

function oneToJoinRelation(rawRelation, name) {
	const relation = {
		reference: rawRelation.reference,
		targetColumn: 'id',
		type: 'one-to-join',
		ownerTable: rawRelation.reference,
		referencedTable: this.name
	};

	this.relations[name] = relation;
	this.properties[name] = 'oneToJoin';
}

function manyToOneRelation(rawRelation, name) {
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
		reference: rawRelation.reference
	};

	const relation = {
		reference: rawRelation.reference,
		targetColumn: 'id',
		type: 'many-to-one',
		ownerTable: this.name,
		referencedTable: rawRelation.reference
	};

	this.relations[name] = relation;
	this.properties[name] = 'manyToOne';
	this.columns[name] = column;
}

function oneToManyRelation(rawRelation, name) {
	const relation = {
		reference: rawRelation.reference,
		targetColumn: 'id',
		type: 'one-to-many',
		ownerTable: rawRelation.reference,
		referencedTable: this.name
	};

	this.relations[name] = relation;
	this.properties[name] = 'oneToMany';
}

function manyToManyRelation(rawRelation, name) {
	const tableName = this.name;
	const sortedTables = [rawRelation.reference, tableName].sort();
	const targetTable = `relation_${sortedTables.join('_')}`;

	const relation = {
		reference: rawRelation.reference,
		column1: sortedTables[0],
		column2: sortedTables[1],
		targetTable,
		type: 'many-to-many'
	};

	this.relations[name] = relation;
	this.properties[name] = 'manyToMany';
}

function defaultRelation(rawRelation, name) {
	const tableName = this.name;
	const sortedTables = [rawRelation.reference, tableName].sort();
	const targetTable = `relation_${sortedTables.join('_')}`;

	const relation = {
		reference: rawRelation.reference,
		column1: sortedTables[0],
		column2: sortedTables[1],
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
