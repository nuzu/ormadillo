


function configMapper(model, connection) {
    Object.defineProperty (this, 'name', {value: model.name})    
    this.connection = connection
    this.raw_properties = model.properties
    this.modelOptions = model.options || {}
    this.events = model.events || {}
    this.methods = model.methods || {}
    this.requireds = []
    this.uniques = []
    this.virtuals = {}
    this.enums = {}
    this.properties = {}
    this.relations = {}
    this.columns = {}
    this.indices = []
    this.arrays = []
    this.primary = "id"
    parseProperties.call(this)

}

function sortIntoType(name, value) {
    switch(value.type.toLowerCase()) {
        case "string":
        case "number":
        case "int":
        case "integer":
        case "float":
        case "boolean":
        case "object":
        case "json":
        case "enum":
        case "datetime":
        case "timestamp":
        case "date":
        case "time":
        case "id":
        case "uuid":
            this.properties[name] = "columns"
            this.columns[name] = parseProperty.call(this, value, name)
            break;
        case "reference":
        case "relation":
            parseRelation.call(this, value, name)
            break;
        case "virtual":
            this.properties[name] = "virtuals"
            this.virtuals[name] = parseVirtual.call(this, value, name)
            break;
        case "embedded":
        default: 
            console.log("unable to parse this " + name)

    }
}

function parseProperties() {
    let properties = { },
        errors = [], 
        raw_props = this.raw_properties
    this.idTaken = false

    for(let key in raw_props) {
        sortIntoType.call(this, key, raw_props[key])
    }
    if(!this.idTaken) addIDProperty.call(this, this.primary)
    if(this.modelOptions.timestamps) addTimeStampProperties.call(this)
}

function addTimeStampProperties() {
    let columns = {
        createdAt: {
            name: "createdAt",
            type: "datetime",
            required: false,
            unique: false,
           // defaultValue: require('moment')().format('YYYY-MM-DD HH:mm:ss'),
            isEnum: false,
            array: false
        },
        updatedAt: {
            name: "updatedAt",
            type: "datetime",
            required: false,
            unique: false,
           // defaultValue: require('moment')().format('YYYY-MM-DD HH:mm:ss'),
            isEnum: false,
            array: false
        }
    }

    Object.assign(this.properties, {
        createdAt: "columns",
        updatedAt: "columns"
    })
    Object.assign(this.columns, columns)
}

function addIDProperty(name) {
    let property = {
        name,
        type: "id",
        required: true,
        unique: true,
        index: true,
        defaultValue: undefined,
        isEnum: false,
        array: false,
    }
    this.requireds.push(name)
    this.uniques.push(name)
    this.properties[name] = "columns"
    this.columns[name] = property
    return property
}

function parseProperty(raw_prop, name) {
    let property = {
        name, 
        required: false,
        unique: false,
        index: false,
        defaultValue: undefined,
        isEnum: false,
        array: false,
        maxLength: 254
    }
    property.type = parsePropType(raw_prop.type)
    
    //TODO: better selection to allow for custom error messages
    if(raw_prop.required) {
        this.requireds.push(name)
        property.required = true
    }
    if(raw_prop.unique) {
        this.uniques.push(name)
        property.unique = true
    }
    if(raw_prop.index) {
        this.indices.push(name)
        property.index = true
    }

    if(property.type === "virtual") {
        property.virtualFn = raw_prop.function
        this.virtuals.push(name)
    }

    if(property.type === "enum") property.isEnum = true
    if(raw_prop.array) {
        this.arrays.push(name)
        property.array = true}

    if(raw_prop.hasOwnProperty("defaultValue")) property.defaultValue = raw_prop.defaultValue
    if(raw_prop.hasOwnProperty("length")) property.maxLength = raw_prop.maxLength

    return property
}

function parsePropType(type) {
    switch (type.toLowerCase()) {
        case "string":
            return "string"
        case "virtual":
            return "virtual"
        case "boolean":
            return "boolean"
        default:
            return "string"
    }
}


function parseRelation(raw_relation, name) {
    const $rt = require('./relationTools')
    let relationType = raw_relation.relation || ""
    switch(relationType.toLowerCase()) {
        case "one-to-one":
        case "join-to-join":
            return $rt.joinToJoinRelation.call(this, raw_relation, name);
        case "join-to-one":
            return $rt.joinToOneRelation.call(this, raw_relation, name);
        case "one-to-join":
            return $rt.oneToJoingRelation.call(this, raw_relation, name)        
        case "one-to-many":
            return $rt.oneToManyRelation.call(this, raw_relation, name);
        case "many-to-one":
            return $rt.manyToOneRelation.call(this, raw_relation, name);
        case "many-to-many":
            return $rt.manyToManyRelation.call(this, raw_relation, name);
        default:
            return $rt.defaultRelation.call(this, raw_relation, name)

    } 

    if(raw_relation.required) {
        this.requireds.push(name)
        column.required = true
    }
    if(raw_relation.unique) {
        this.uniques.push(name)
        column.unique = true
    }

    return {
        relation,
        column
    }
}

function parseVirtual(raw_virtual, name) {
    let property = parseProperty(raw_virtual)
    property.type = "virtual"
    
    return property
}

async function validate(entry, cb) {
    try {
        let errors = []
        if(!entry) {
            let {$mapper, 
                ...rest} = this
            if(rest) entry = rest
        }
        let properties = this.properties || this.$mapper.properties
        if(typeof entry !== "object") throw "Unable to identify variable which is not an object."
        for(let key in entry) {
            if(!properties.hasOwnProperty(key)) {
                errors.push(`Invalid parameter - ${key}`)
            }
        }
        if(errors.length > 0) throw errors
        if(cb) return cb(null)
        console.log("validated")
        return true
    } catch(errors) {
        if(!Array.isArray(errors)) errors = [errors]
        errors.forEach(error => console.log(error))
        if(cb) return cb(errors)
        return false
    }
}

async function save() {
    try {
        let { $mapper, ...entry } = this
        let res
        if(entry[$mapper.primary]) {
            // could do it for any unique value
            let selector = {
                [$mapper.primary] : entry[$mapper.primary]
            }

            res = await $mapper.updateOne.call($mapper, selector, entry)
        } else {
            res = await $mapper.insertOne.call($mapper, entry)
        }
        return res.item
    } catch(errors) {
        if(!Array.isArray(errors)) errors = [errors]
        errors.forEach(error => console.log(error))
        return false
    }
}



export default {
    configMapper,
    validate,
    save,
    
}