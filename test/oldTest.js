const colors = require('colors')
const ormadillo = require('../build').default
const express = require('express')
let app = express()

let SILENT = false

const DATABASE_POSTGRES = {
    name: "postgres",
    dialect: "postgres",
    connection: {
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "",
        database: "testdb",
        schema: "public",
    },
    options: {
        alwaysRebuild: true
    }
}

const DATABASE_SQLITE = {
    name: "sqlite",
    dialect: "sqlite",
    connection: {
        filename: "./test/db/db.sqlite"
    },
    options: {
        alwaysRebuild: true
    }
}


app.nuzu = {
    config: {
        models: {
            directory: './test/models'
        },
        database: DATABASE_POSTGRES
    }
}

/* 
const knex = require('knex')({
    client: "sqlite",
    connection: {
        filename: "db.sqlite"
    }
})

let read = async (knex) => {
    
    await knex.schema.createTable('new', table => {
        table.string("mew")
        table.integer("sexy")
   }) 
    await knex("new").insert({mew: "three", sexy: 2})
    const records = await knex.raw(`SELECT * FROM sqlite_master
    WHERE type='table'
    ORDER BY name;`)
    const pragma = await knex.raw(`PRAGMA table_info('new')`)
    console.log(pragma)
}

read(knex) */

let Post, Author, db, server

const counter = {
    total: 0,
    success: 0
}

const testNow = () => {
    console.log("calls once")
    const a = '/'
    const b = 'meow'
    return (req, res, next) => {
        req.a = a
        res.send({[b]: req.a})
    }
}

const listen = async () => {
    await ormadillo(app)
    //app.use('/', testNow())
    //server = app.listen(4000)
    //return server
    return
}

const setup = async () => {
    db = app.nuzu.db
    Post = db.Post
    Author = db.Author
}

const runTest = async () => {
    await listen()
    await setup()
    !SILENT && console.log(`

                BEGIN TESTING
`.bgWhite.black.bold)
    console.log("")
    const test_insertMany = await Author.insertMany([
        {
            name: "Little China"
        },
        {
            name: "KA Applegate"
        },
        {
            name: "KRowling"
        }
    ])
    test("insert many", test_insertMany.count, 3)


    const fail_post = new Post({random: "not random"})
    const test_validate1 = await fail_post.validate()
    test("validation fail", test_validate1, false)

    const work_post = new Post({title: "Javascript works", author: 2})
    const test_validate2 = await work_post.validate()
    test("validation success", test_validate2)

    const test_save_item = await work_post.save()
    test("save instance", test_save_item.title, work_post.title)

    test_save_item.title = "Python works too"
    const test_update_save = await test_save_item.save()
    test("update by save", test_update_save.title, test_save_item.title)

    //const test_insertWrong = await Post.insertOne({random: "not so random is it"})
    //console.log(`VALIDATION TEST - ${!test_validate ? "success" : "fail"}`)
    
    const test_insert = await Post.insertOne({title: "Gello World", author: 1, tags: ["post", "first Post"]})
    test("insert one", test_insert.item.title, "Gello World")
    
    const test_find = await Post.find({title: "Gello World"})
    test("find", test_find.items[0].author.id, 1)
    test("find - populated arrays", test_find.items[0].tags.length, 2)


    const test_updateOne = await Post.updateOne({title: "Gello World"}, {author: "3"})
    test("update one", test_updateOne.item.author.id, 3)
    
    await Post.deleteOne({title: "Gello World"})
    const test_searchForDeleted = await Post.findOne({title: "Gello World"})
    test("delete one", test_searchForDeleted.item, null)

/*     const test_insertMany = await Post.insertMany([
        {
            title: "Random Book",
            author: 3
        },
        {
            title: "No random book",
            author: 3
        },
        {
            title: "less random book",
            author: 3
        }
    ])
    console.log(`INSERT MANY TEST - ${test_insertMany.count === 3 ? "success" : "fail"}`)
 */
    await db.disconnect()

    return 
}


function test (description, actual, expected = true) {
    if(actual === expected) {
        counter.total++
        counter.success++
        !SILENT && console.log(`     \u2705        "${description}"`)
    } else {
        counter.total++
        !SILENT && console.log(`     \u274C        "${description}"`)

    }
}



runTest().then(() => {
    console.log(`
        TESTS COMPLETE ${counter.success}/${counter.total}
    `.green)
    process.exit()
})

