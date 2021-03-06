function createSchema() {
	const yup = require('yup');
	const {properties, columns, arrays, relations, connection} = this;
	const objectShape = {
		$mapper: yup
			.mixed()
			.notRequired()
			.strip()
	};
	for (const key in properties) {
		if ({}.hasOwnProperty.call(properties, key)) {
			if (properties[key] === 'columns') {
				const yupType = getYupType(columns[key].type);
				if (yupType && !arrays.includes(key)) {
					objectShape[key] = yupType;
				} else if (yupType) {
					objectShape[key] = yup.array().of(yupType);
				}
			}
			if (
				[
					'joinToOne',
					'joinToJoin',
					'oneToJoin',
					'manyToOne',
					'oneToMany',
					'manyToMany',
					'defaultRelation'
				].includes(properties[key])
			) {
				objectShape[key] = yup.lazy(value => {
					let a = yup
						.mixed()
						.notRequired()
						.nullable();
					if (value !== undefined) {
						const valueType = typeof value;
						switch (valueType) {
							case 'string':
								a = yup.string().nullable();
								break;
							case 'number':
								a = yup.number().nullable();
								break;
							case 'object':
								a =
									connection.repository[relations[key].reference]
										.validationSchema;
								break;
							default:
								break;
						}
						if (
							['oneToMany', 'manyToMany', 'defaultRelation'].includes(
								properties[key]
							)
						) {
							a = yup.array(a);
						}
					}
					return a;
				});
			}
		}
	}
	const schema = yup
		.object()
		.shape(objectShape)
		.noUnknown(true);
	return schema;
}

function getYupType(type) {
	switch (type.toLowerCase()) {
		case 'string':
			return require('yup').string();
		case 'number':
			return require('yup').number();
		case 'boolean':
			return require('yup').boolean();
		case 'id':
			return require('yup').lazy(val => {
				if (val !== undefined) {
					if (typeof val === 'string') {
						return require('yup').string();
					}
					if (typeof val === 'number') {
						return require('yup').number();
					}
				}
				return require('yup')
					.mixed()
					.notRequired();
			});
		case 'datetime':
		case 'date':
		case 'time':
			return require('yup').date();
		default:
			console.log(`NEEDS VALIDATION FOR TYPE ${type}`);
			break;
	}
	return false;
}

export default createSchema;
