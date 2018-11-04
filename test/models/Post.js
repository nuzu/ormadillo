module.exports = {
	name: 'Post',
	properties: {
		title: {
			type: 'String',
			required: true
		},
		body: {
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
