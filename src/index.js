import glob from 'glob'
import path from 'path'
import Connection from './class/Connection'
import createMapper from './class/createMapper'

const loadModels = (config) => {
    let modelsDir = 'src/backend/models'
    if(config.models && config.models.directory) modelsDir = config.models.directory 
    return glob.sync(`${modelsDir}/*.js`)
                .map(each => require(path.resolve('.', each)))
}

const createMappers = (models, connection) => {
    const mappers = models.map(model => createMapper(model, connection))
    return mappers
}

const createConnection = (dbConfig) => {
    let connection = new Connection(dbConfig, dbConfig.name)
    return connection
}

const expressOrm = async (config) => {
    let db = createConnection(config.database)
    let models = loadModels(config)
    let mappers = createMappers(models, db)
    await db.build(mappers)
    return (req, res, next) => {
        req.db = db
        req.models = models
        req.mappers = mappers
        next()
    }
}


export {
    loadModels,
    createMappers,
    createConnection,
    expressOrm
}

export default async (app, config) => {
    if(!config) config = app.nuzu.config
    let db = createConnection(config.database)
    let models = loadModels(config)
    let mappers = createMappers(models, db)
    await db.build(mappers)
    Object.assign(app.nuzu, { db, models, mappers})
    return app
}