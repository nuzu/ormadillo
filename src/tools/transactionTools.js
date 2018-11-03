async function insertOne(entry, insertOptions) {
  try {
    let connection = this.connection;
    if (!connection) throw "No connection";
    const [query, queryOptions] = await beforeInsert.call(this, entry, insertOptions);
    const record = await connection._tools.insertOne.call(
      this,
      query,
      queryOptions
    );
    const item = await afterInsert.call(this, record);
    return {
      success: true,
      error: null,
      item,
      items: [item],
      count: 1
    };
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function insertMany(entries, insertOptions) {
  try {
    let Mapper = this;
    let connection = this.connection;
    if (!connection) throw "No connection";
    if (!Array.isArray(entries)) entries = [entries]
    const items_0 = await connection._tools.insertMany.call(
      this,
      entries,
      insertOptions
    );
    const items = items_0.map(each => new Mapper(each));
    return {
      success: true,
      error: null,
      item: items[0],
      items,
      count: items.length
    };
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function find(entry, findOptions) {
  try {
    let Mapper = this;
    let connection = this.connection;
    if (!connection) throw "No connection";
    const items_0 = await connection._tools.find.call(this, entry, findOptions);
    const items = items_0.map(each => new Mapper(each));
    return {
      success: true,
      error: null,
      item: items[0],
      items,
      count: items.length
    };
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function findOne(entry, findOptions) {
  try {
    let Mapper = this;
    let connection = this.connection;
    if (!connection) throw "No connection";
    const record = await connection._tools.findOne.call(
      this,
      entry,
      findOptions
    );
    if(record) {
      const item = new Mapper(record)
      return {
        success: true,
        error: null,
        item,
        count: 1,
        items: [item]
      };
    } else {
      return {
        success: false,
        error: "No record",
        count: 0,
        items: [],
        item: null
      }
    }
    
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function updateOne(selector, values, updateOptions) {
  try {
    let Mapper = this;
    let connection = this.connection || this.$mapper.connection;
    if (!connection) throw "No connection";
    const item_0 = await connection._tools.updateOne.call(
      this,
      selector,
      values,
      updateOptions
    );
    const item = new Mapper(item_0);
    return {
      success: true,
      error: null,
      item,
      count: 1,
      items: [item]
    };
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function updateMany(selectorsArray, updatedValues, updateOptions) {
  try {
    let connection = this.connection || this.$mapper.connection;
    if (!connection) throw "No connection";
    const items = await connection._tools.updateMany.call(
      this,
      selectorsArray,
      updatedValues,
      updateOptions
    );
    return {
      success: true,
      error: null,
      item: items[0],
      items,
      count: items.length
    };
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function deleteOne(selector, deleteOptions) {
  try {
    let connection = this.connection || this.$mapper.connection;
    if (!connection) throw "No connection";
    const item = await connection._tools.deleteOne.call(
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
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function deleteMany(selectors, deleteOptions) {
  try {
    let connection = this.connection || this.$mapper.connection;
    if (!connection) throw "No connection";
    const items = await connection._tools.deleteMany.call(
      this,
      selectors,
      deleteOptions
    );

    return {
      success: true,
      error: null,
      item: item[0],
      items,
      count: items.length
    };
  } catch (errors) {
    if (!Array.isArray(errors)) errors = [errors];
    errors.forEach(error => console.log(error));
    return false;
  }
}

async function beforeInsert(entry, options) {
  const { timestamps, uuid, short } = this.modelOptions;
  if (uuid) entry = addUuid(entry)
  if (short) entry = addShort(entry)
  if (timestamps) entry = addTimestamps(entry)
      
  const isValidated = await require("./mapperTools").default.validate.call(
    this,
    entry
  );
  if (!isValidated) throw "Unable to validate entry data. Check the console log for more information.";
  
  


  return [entry, options];
}

async function afterInsert(entry) {
  const Mapper = this;
  const item = new Mapper(entry);
  return item;
}

function addUuid(entry, options) {
  entry.uuid = require('uuid/v4')()
  return entry
}

function addShort(entry, options) {
  entry.short = require('shortid').generate()
  return short
}

function addTimestamps(entry) {
  entry.createdAt = new Date();
  entry.updatedAt = new Date();
  return entry;
}

function relateBeforeInsert(entry) {

}

export default {
  insertOne,
  insertMany,
  find,
  findOne,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany
};
