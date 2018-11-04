import $mt from '../tools/mapperTools';
import $tt from '../tools/transactionTools';

const createMapper = (model, connection) => {
	class Mapper {
		constructor(raw_entry) {
			Object.assign(this, raw_entry);
			this.$mapper = this.constructor;
		}

		async validate(entry) {
			return await $mt.validate.call(this, entry);
		}

		async save() {
			return await $mt.save.call(this);
		}

		static async insertOne(item, insertOptions) {
			return await $tt.insertOne.call(this, item, insertOptions);
		}

		static async insertMany(items, insertOptions) {
			return await $tt.insertMany.call(this, items, insertOptions);
		}

		static async find(query, findOptions) {
			return await $tt.find.call(this, query, findOptions);
		}

		static async findOne(query, findOptions) {
			return await $tt.findOne.call(this, query, findOptions);
		}

		static async updateOne(selector, values, updateOptions) {
			return await $tt.updateOne.call(this, selector, values, updateOptions);
		}

		static async updateMany(updateArray, updateOptions) {
			return await $tt.updateMany.call(this, updateArray, updateOptions);
		}

		static async deleteOne(selector, deleteOptions) {
			return await $tt.deleteOne.call(this, selector, deleteOptions);
		}

		static async deleteMany(selectors, deleteOptions) {
			return await $tt.deleteMany.call(this, selectors, deleteOptions);
		}
	}
	$mt.configMapper.call(Mapper, model, connection);
	return Mapper;
};

export default createMapper;

