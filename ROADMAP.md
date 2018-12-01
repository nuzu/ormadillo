# Getting Started

## Initiation

1. Define basic connection settings in a **config** object

```javascript
const config = {
    models: {
        directory: './models'
    },
    database: {
        name: 'postgres',
        dialect: 'postgres',
        connection: {
            host: 'localhost',
            port: 5432,
            username: 'postgres'
            password: '',
            database: 'dev',
            schema: 'public'
        }
    }
}

```

config API. 

2. Build your models (one model per file).

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

Models API

3. Connect to database: returns a payload, including a *Connection* instance

```javascript

import ormadillo from '@nuzu/ormadillo';
import config from './config.js';

const startServer = async () => {
    const {db} = await ormadillo(config);
}

startServer();

```

c

User -> index.js
const **library** = require(**'ormadillo'**);

