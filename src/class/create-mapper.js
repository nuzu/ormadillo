import $mt from '../tools/mapper-tools';
import $tt from '../tools/transaction-tools';

const createMapper = (model, connection) => {
	class Mapper {
		constructor(rawEntry) {
			Object.assign(this, rawEntry);
			this.$mapper = this.constructor;
		}

		async validate(entry) {
			const res = await $mt.validate.call(this, entry);
			return res;
		}

		async save() {
			const res = await $mt.save.call(this);
			return res;
		}

		returnObject() {
			const res = $mt.returnObject.call(this);
			return res;
		}

		static async insertOne(item, insertOptions) {
			const res = await $tt.insertOne.call(this, item, insertOptions);
			return res;
		}

		static async insertMany(items, insertOptions) {
			const res = await $tt.insertMany.call(this, items, insertOptions);
			return res;
		}

		static async find(query, findOptions) {
			const res = await $tt.find.call(this, query, findOptions);
			return res;
		}

		static async findOne(query, findOptions) {
			const res = await $tt.findOne.call(this, query, findOptions);
			return res;
		}

		static async updateOne(selector, values, updateOptions) {
			const res = await $tt.updateOne.call(
				this,
				selector,
				values,
				updateOptions
			);
			return res;
		}

		static async updateMany(updateArray, updateOptions) {
			const res = await $tt.updateMany.call(this, updateArray, updateOptions);
			return res;
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
	$mt.configMapper.call(Mapper, model, connection);
	return Mapper;
};

export default createMapper;
