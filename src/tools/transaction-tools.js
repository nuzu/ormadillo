async function deleteOne(selector, deleteOptions) {
	try {
		const item = await this.connection.tools.deleteOne.call(
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
		const items = await connection.tools.deleteMany.call(
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

/**
 * This adds OR finds the relations that need to be inserted OR found
 * before the parent entry is inserted into the database
 */

export default {
	deleteOne,
	deleteMany
};
