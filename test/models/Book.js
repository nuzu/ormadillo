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
			type: 'String',
			array: true
		}
	},
	options: {
		rebuild: true,
		timestamps: true,
		shortid: true
	}
};
