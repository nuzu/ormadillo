'use strict'

import $ct from '../tools/connectionTools'
import $bt from '../tools/buildTools'


class Connection {
    constructor(config, name) {
        try {
            $ct.config.call(this, config, name)
            $ct.connect.call(this, config)
        
            $ct.testConnection.call(this)
            $ct.introspectDatabase.call(this) 
        } catch(error) {
            console.log(error.message)
        }
        
    }
    async build(mappers) {
        if(this._dbOptions.alwaysRebuild) {
            const res = await $bt.dropAllTables.call(this)
            if(res) {
                const tables = await $bt.createTables.call(this, mappers)
                await Promise.all(tables.map(table => this[table.name] = table))
            }
        }
        return
        
    }

    async hasTable(tableName) {
        return await $bt.hasTable.call(this, tableName)
    }




    async connect() {

    }

    async disconnect() {
        await $ct.disconnect.call(this)
        return true
    }
    async createTable(mapper) {
        await $bt.createTable.call(this, mapper)
        return mapper

    }
    async dropTable(tableName) {

    }

    async insert(tableName, item, insertOptions) {
        console.log(this)
    }

}

export default Connection