module.exports = {
	name: 'User',
	properties: {
		firstName: {
			type: 'String',
			required: true
		},
		lastName: {
			type: 'String',
			required: true
		},
		password: {
			type: 'String',
			required: true,
			hash: true
		},
		email: {
			type: 'String',
			required: true,
			unique: true
		},
		isVerified: {
			type: 'Boolean',
			defaultValue: false
		},
		friends: {
			type: 'String',
			array: true
		}
	},
	events: {
		beforeInsert: ['hashPassword']
	},
	methods: {
		hash: async input => {
			const bcrypt = require('bcrypt');
			const salt = bcrypt.genSaltSync();
			const output = await bcrypt.hashSync(input, salt);
			return output;
		},
		hashPassword: async (input, row, table, database) => {
			const password = await table.methods.hash(input.password);
			input.password = password;
			return input; // Return input to the lifecycle
		}
	},
	options: {
		rebuild: false,
		timestamps: true,
		shortid: true,
		uuid: true
	}
};
