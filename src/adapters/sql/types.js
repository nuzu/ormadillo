function getJavascriptType(type) {
    switch(type.toLowerCase()) {
        case "string":
            return "string"
        case "integer":
        case "float":
        case "number":
        case "decimal":
            return "number"
        default:
            return "string"
    }
}

function getStandardType(type) {
    switch(type.toLowerCase()) {
        case "character varying":
        case "string":
        case "text":
        case "character":
            return "string"
        case "integer":
            return "integer"
        case "timestamp with time zone":
        case "timestamp without time zone":
            return "datetime"
        case "boolean":
            return "boolean"
    }
}

function getKnexFunction(type) {
    switch(type.toLowerCase()) {
        case "string":
            return "string";
        case "integer":
        case "reference":
        case "relation":
            return "integer"; // needs to be made unsigned for reference
        case "number":
        case "float":
            return "float";
        case "boolean":
            return "boolean";
        case "date":
            return "date";
        case "time":
            return "time";
        case "datetime":
        case "timestamp":
            return "timestamp";
        case "object":
        case "json":
            return "json";
        case "uuid":
            return "uuid";
        case "id":
            return "increments";
        default:
            return "null";
    }
}

module.exports = {
    getJavascriptType,
    getStandardType,
    getKnexFunction
}