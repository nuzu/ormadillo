# ormadillo
Zero-config, fully customisable cross-database object-relational mapping (ORM) library

## Priorities
- [x] Setting up adequate tests 
- [ ] Adequate documentation for basic usage (whether possible or not just yet)
- [x] Linting
- [ ] Get **Objectives** to work with databases in the following order: Postgres, MySQL

## Technologies

- **Jest** for testing
- **xo** and **prettier** for styling
- **babel** for compiling/transpiling

## Objectives
1. Create a connection with the database
2. Test this connection
3. Create tables/schemas in the database based on the Models provided including complex data structures such as a) arrays b) relations c) enums d) embedded/objects
4. Insert document/row into database including the complex data structures above
5. Query document/row from database including the complex data structures above
6. Update document/row in database including the complex data structures above
7. Delete document/row from database including dependent objects
8. Support for common operators for INSERT, QUERY, UPDATE and DELETE such as "$in" or "$gt"

## Installation

In the future, this will be available in an npm package as below:

```
npm install @nuzu/ormadillo --save
```

However, currently it is available via: 

```
npm install https://github.com/nuzu/ormadillo --save
```

## Usage

All the below depend on the setup of a config file, containing connection information, and models for the database to be built on.

```javascript
let config = {
    models: {
        directory: './src/models'
    },
    database: {
        name: 'postgres',
        dialect: 'postgres',
        connection: {
            host: '127.0.0.1',
            port: 5432,
            username: 'username',
            password: 'password',
            database: 'main',
            schema: 'public'
        },
        options: {
            alwaysRebuild: false
        }
    }
}

```

See more options for the config file in the GitHub wiki. 

The the models need to be created in *./src/models*. 

src/models/Post.js
```javascript
module.exports = {
	name: 'Post',
	properties: {
		title: {
			type: 'String',
			required: true
		},
		body: {
			type: 'String'
		},
		isPublished: {
			type: 'Boolean',
			required: true,
			defaultValue: false
		},
		author: {
			type: 'Reference',
			required: true,
			reference: 'Author',
			relation: 'many-to-one'
		},
		tags: {
			type: 'String',
			array: true
		}
	},
	options: {
		timestamps: true,
		shortid: true
	}
};
```

See the Models page in the GitHub wiki for more details. 

### Standalone Library

```javascript
import orm from '@nuzu/ormadillo';

let config = ...

const connect = async () => {
    let {db} = await orm(config),
        Post = db.Post
    
    await Post.insertMany({...})
    return
}

run()
```

### Framework Middlewares

Incoming.

## Contributing

This project is in ACTIVE development and is looking for all sorts of help. We are especially keen on first-timers who would like to make their first contributions/pull requests. 

There is no working library for issues to be made just yetm but feel free to shoot me a message on twitter @realdoctorniz. 

## License

MIT. Copyright 2018. 
