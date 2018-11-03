async function createTable(mapper) {
    const knex = this.client
    const response = await knex.schema.createTable(mapper.name, createKnexCallback(mapper))
    await Promise.all(mapper.arrays.map(async array => {
        await createArrayTable.call(this, mapper.columns[array], mapper.name)
    }))
    console.log(`New table "${mapper.name}" created successfully`)    
    return null
}

async function createArrayTable(array, mapperName) {
    const knex = this.client
    let arrayTableName = `array_${mapperName}_${array.name}`
    await knex.schema.createTable(arrayTableName, async t => {
        t.increments("id")
        t.integer("key")
            .unsigned()
            .references("id")
            .inTable(mapperName)
            .onDelete("CASCADE")
            .onUpdate("CASCADE")
        t[require('./types').getKnexFunction(array.type)]("value")
    
        
    })
    return
}

async function formAllRelations(mappers) {
    console.log("Forming relations")
    await Promise.all(mappers.map(async (mapper) => await formRelations.call(this, mapper)))
    console.log("All relations formed")
    return
}

async function formRelations(mapper) {
    const knex = this.client
    let {
        name,
        relations,
        properties
    } = mapper
    let relationsColumns = {}, relationsTables = {}
    for(let key in relations) {
        switch(relations[key].type) {
            case "join-to-join":
            case "join-to-one":
            case "many-to-one":
                relationsColumns[key] = relations[key];
                break;
            case "many=tp-many":
            case "defaultRelation":
                relationsTables[key] = relations[key];
                break;
            default:
                break;
        }
    }
    
    await knex.schema.table(name, t => {
        for(let key in relationsColumns) {
            t.integer(key)
            .unsigned()
            .references("id")
            .inTable(relationsColumns[key].reference)
            .onDelete("CASCADE")
            .onUpdate("CASCADE")
            if(["join-to-join", "join-to-one"].includes(relationsColumns[key].type)) t.unique(key)
        }
        return
    })

    await Promise.all(Object.keys(relationsTables).map(async key => {
        let relation = relationsTables[key]
        await knex.schema.createTable(relation.targetTable, t => {
            t.integer(`${relation.column_1}_id`)
            .unsigned()
            .references("id")
            .inTable(relation.column_1)
            .onDelete("CASCADE")
            .onUpdate("CASCADE")
            
            t.integer(`${relation.column_2}_id`)
            .unsigned()
            .references("id")
            .inTable(relation.column_2)
            .onDelete("CASCADE")
            .onUpdate("CASCADE")
            
            t.primary([`${relation.column_1}_id`, `${relation.column_2}_id`])
        })
    }))
     

    return mapper
    
}

const createKnexCallback = (mapper) => {
    return t => {
        let {id, ...rest} = mapper.columns
        t[require('./types').getKnexFunction(id.type)]("id") // custom id names ?
        
        for(let key in rest) {
            let {
                type,
                defaultValue,
                required,
                array
            } = rest[key]
            let column
            if(type.toLowerCase() !== "relation") {
                if(!array) column = t[require('./types').getKnexFunction(type)](key)
                //if(array) column = t.specificType(key, ``)
                if(column && required) column.notNullable()
                if(column && defaultValue !== undefined) column.defaultsTo(defaultValue)
            }
            
        }
        t.unique(mapper.uniques)
    }
}

module.exports = {
    createTable,
    createArrayTable,
    formAllRelations,
    formRelations,
    createKnexCallback
}