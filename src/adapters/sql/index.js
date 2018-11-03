const connect = require('./connect')
const build = require('./build')
const tables = require('./tables')
const insert = require('./insert')
const find = require('./find')

module.exports = {

    ...connect,
    ...build,
    ...tables,
    ...insert,
    ...find,

}