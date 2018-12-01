async function createTable(mapper) {
	const knex = this.client;
	const {name, columns, arrays} = mapper;
	await knex.schema.createTable(name, createKnexCallback(mapper));
	await Promise.all(
		arrays.map(async array => {
			await createArrayTable.call(this, columns[array], name);
		})
	);
	console.log(`New table "${name}" created successfully`);
	return null;
}

async function createArrayTable(array, mapperName) {
	const knex = this.client;
	const arrayTableName = `array_${mapperName}_${array.name}`;
	await knex.schema.createTable(arrayTableName, t => {
		t.increments('id');
		t.integer('key')
			.unsigned()
			.references('id')
			.inTable(mapperName)
			.onDelete('CASCADE')
			.onUpdate('CASCADE');
		t[require('./types').getKnexFunction(array.type)]('value');
	});
}

async function formAllRelations(mappers) {
	console.log('Forming relations');
	await Promise.all(
		mappers.map(async mapper => {
			const res = await formRelations.call(this, mapper);
			return res;
		})
	);
	console.log('All relations formed');
}

async function formRelations(mapper) {
	const knex = this.client;
	const {name, relations} = mapper;
	const relationsColumns = {};
	const relationsTables = {};
	for (const key in relations) {
		if ({}.hasOwnProperty.call(relations, key)) {
			switch (relations[key].type) {
				case 'join-to-join':
				case 'join-to-one':
				case 'many-to-one':
					relationsColumns[key] = relations[key];
					break;
				case 'many-to-many':
				case 'defaultRelation':
					relationsTables[key] = relations[key];
					break;
				default:
					break;
			}
		}
	}

	await knex.schema.table(name, t => {
		for (const key in relationsColumns) {
			if ({}.hasOwnProperty.call(relationsColumns, key)) {
				t.integer(key)
					.unsigned()
					.references('id')
					.inTable(relationsColumns[key].reference)
					.onDelete('CASCADE')
					.onUpdate('CASCADE');
				if (
					['join-to-join', 'join-to-one'].includes(relationsColumns[key].type)
				) {
					t.unique(key);
				}
			}
		}
	});

	await Promise.all(
		Object.keys(relationsTables).map(async key => {
			const relation = relationsTables[key];
			await knex.schema.createTable(relation.targetTable, t => {
				t.integer(`${relation.column1}_id`)
					.unsigned()
					.references('id')
					.inTable(relation.column1)
					.onDelete('CASCADE')
					.onUpdate('CASCADE');

				t.integer(`${relation.column2}_id`)
					.unsigned()
					.references('id')
					.inTable(relation.column2)
					.onDelete('CASCADE')
					.onUpdate('CASCADE');

				t.primary([`${relation.column1}_id`, `${relation.column2}_id`]);
			});
		})
	);

	return mapper;
}

const createKnexCallback = mapper => {
	return t => {
		const {id, ...rest} = mapper.columns;
		t[require('./types').getKnexFunction(id.type)]('id'); // Custom id names ?

		for (const key in rest) {
			if ({}.hasOwnProperty.call(rest, key)) {
				const {type, defaultValue, required, array} = rest[key];
				let column;
				if (type.toLowerCase() !== 'relation') {
					if (!array) {
						column = t[require('./types').getKnexFunction(type)](key);
					}
					// If(array) column = t.specificType(key, ``)
					if (column && required) {
						column.notNullable();
					}
					if (column && defaultValue !== undefined) {
						column.defaultsTo(defaultValue);
					}
				}
			}
		}
		t.unique(mapper.uniques);
	};
};

module.exports = {
	createTable,
	createArrayTable,
	formAllRelations,
	formRelations,
	createKnexCallback
};
