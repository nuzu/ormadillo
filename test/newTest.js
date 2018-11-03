const ormadillo = require('../build').default

const express = require('express')
let app = express()

const DATABASE_SQLITE = {
    name: "sqlite",
    dialect: "sqlite",
    connection: {
        filename: "./db/db.sqlite"
    }
}

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

app.nuzu = {
    config: {
        models: {
            directory: './test/models'
        },
        database: DATABASE_SQLITE
    }
}

let Post, Author, server


const listen = async () => {
    await ormadillo(app)
    return app
}

const setup = async () => {
    Post = app.nuzu.db.Post
    Author = app.nuzu.db.Author
}


const test = async () => {
    await listen()
    await setup()
    describe('insert many', async () => {
        let records = await Author.insertMany([
            {
                name: "R.L. Stine"
            },
            {
                name: "KA Applegate"
            },
            {
                name: "JK Rowling"
            }
        ])
        expect(records.count).toBe(3)
    })
}

test()



function describe(description, callback) {
    

    callback()
        .then(() => {
            console.log()
        })
        .catch(error => {
            console.log(description)
            console.log(error)
        })
    
}

function it(...args) {

}


function expect(actual) {
    var storedActual = actual
    console.log(this)
    return {
      pipe(func, ...params) {
        const input = [testedFunc, ...params]
        currentValue = func.apply(null, input)
  
        return this
      },
  
      toBe(expected) {
        return storedActual === expected
      }
    }
  } 

/* 
describe('check connection', () => {
    beforeEach(() => {
        
    })
    
    it('first test', () => {
        expect(2).toBe(2)
    })

    it('3 items inserted', async () => {
        expect.assertions(1)
        let records = await Author.insertMany([
            {
                name: "R.L. Stine"
            },
            {
                name: "KA Applegate"
            },
            {
                name: "JK Rowling"
            }
        ])
        expect(records.count).toEqual(3)
    })

    it('incorrect item not saved', async () => {
        expect.assertions(1)
        let post = await new Post({random: "this should not work"})
        expect(false).toBe(false)
    }) 

})

afterAll(() => {
    return app.nuzu.db.disconnect()
})
 */