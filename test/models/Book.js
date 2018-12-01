module.exports = {
	name: 'Book',
	properties: {
		title: {
			type: 'String',
			required: true
		},
		description: {
			type: 'String'
		},
		isPublished: {
			type: 'Boolean',
			required: true,
			defaultValue: false
		},
		author: {
			type: 'Reference',
			required: true,
			reference: 'Author',
			relation: 'many-to-one'
		},
		tags: {
			type: 'Reference',
			relation: 'many-to-many',
			reference: 'Tag'
		}
	},
	options: {
		rebuild: true,
		timestamps: true,
		shortid: true
	}
};
