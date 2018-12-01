let db = null;

beforeAll(async done => {
	({db} = await require('./setup'));
	done();
});

describe('set up environment', () => {
	it('database is connected', () => {
		expect(db.isConnected).toBe(true);
	});
	it('Book mapper created', () => {
		expect(db.repository).toHaveProperty('Book');
	});
	it('Author mapper created', () => {
		expect(db.repository).toHaveProperty('Author');
	});
});

describe('insert/create', () => {
	let Book;
	let Author;
	let Tag;
	beforeAll(() => {
		({Book, Author, Tag} = db.repository);
	});
	it('inserted many authors', async () => {
		expect.assertions(1);
		const inserted = await Author.insertMany([
			{
				name: 'GRR Martin'
			},
			{
				name: 'KA Applegate'
			},
			{
				name: 'JK Rowling'
			}
		]);
		expect(inserted.count).toEqual(3);
	});

	it('expect validation to fail', async () => {
		expect.assertions(1);
		const post = new Book({random: 'not random'});
		const validated = await post.validate();
		expect(validated).toBe(false);
	});

	it('expect validation to succeed (reference by id)', async () => {
		expect.assertions(1);
		const book = new Book({
			title: 'The Invasion',
			author: 2,
			tags: [{value: 'Animorphs'}]
		});
		const validated = await book.validate();
		expect(validated).toBe(true);
	});

	it('expect validation to succeed (reference by object)', async () => {
		expect.assertions(1);
		const author = new Author({name: 'RL Stine'});
		const book = new Book({title: 'Cuckoo Clock of Doom', author});
		const validated = await book.validate();
		expect(validated).toBe(true);
	});

	it('insert and update by save (reference by id)', async () => {
		expect.assertions(2);
		const book = new Book({title: 'Visitor', author: 2});
		const saved = await book.save();
		expect(saved.title).toBe(book.title);
		saved.title = 'The Visitor';
		const updated = await saved.save();
		expect(updated.title).toBe('The Visitor');
	});

	it('insert and update by save (reference by new object instance)', async () => {
		expect.assertions(3);
		const author = new Author({
			name: 'Eoin Colfer'
		});
		const book = new Book({title: 'The Artemis Fowl', author});
		const saved = await book.save();
		expect(saved.title).toBe(book.title);
		expect(saved.author.name).toBe('Eoin Colfer');
		saved.title = 'Artemis Fowl';
		const updated = await saved.save();
		expect(updated.title).toBe('Artemis Fowl');
	});

	it('insert and update by save (reference by existing object instance)', async () => {
		expect.assertions(3);
		const author = new Author({
			name: 'JK Rowling'
		});
		const book = new Book({
			title: `Harry Potter and the Sorcerer's Stone`,
			author
		});
		const saved = await book.save();
		expect(saved.title).toBe(book.title);
		expect(saved.author.name).toBe('JK Rowling');
		saved.title = `Harry Potter and the Philosopher's Stone`;
		const updated = await saved.save();
		expect(updated.title).toBe(`Harry Potter and the Philosopher's Stone`);
	});

	it('insert and update by save (reference by existing object NOT instance)', async () => {
		expect.assertions(3);
		const author = {
			name: 'JK Rowling'
		};
		const tag = {
			value: 'Harry Potter'
		};
		const book = new Book({
			title: `Harry Potter and the Chamber of Secrets`,
			author,
			tags: [tag]
		});
		const saved = await book.save();
		expect(saved.title).toBe(book.title);
		expect(saved.author.name).toBe('JK Rowling');
		saved.title = `Harry Potter and the Chamber of Secrets`;
		const updated = await saved.save();
		expect(updated.title).toBe(`Harry Potter and the Chamber of Secrets`);
	});

	it('insert by insertOne (reference by id)', async () => {
		expect.assertions(2);
		const payload = await Book.insertOne({
			title: 'The Encounter',
			author: 2
		});
		expect(payload.item.title).toBe('The Encounter');
		expect(payload.item.author.id).toBe(2);
	});

	it('insert by insertOne (reference by new object instance)', async () => {
		expect.assertions(3);
		const author = new Author({
			name: 'Roald Dahl'
		});
		const payload = await Book.insertOne({
			title: 'Matilda',
			author
		});
		expect(payload.item.title).toBe('Matilda');
		expect(payload.item.author.id).toBeDefined();
		expect(payload.item.author.name).toBe('Roald Dahl');
	});

	it('insert by insertOne (reference by new object NOT instance)', async () => {
		expect.assertions(3);
		const author = {
			name: 'Enid Blyton'
		};
		const payload = await Book.insertOne({
			title: 'Five on a Treasure Island',
			author
		});
		expect(payload.item.title).toBe('Five on a Treasure Island');
		expect(payload.item.author.id).toBeDefined();
		expect(payload.item.author.name).toBe('Enid Blyton');
	});

	it('insert by insertOne (reference by existing object NOT instance)', async () => {
		expect.assertions(3);
		const author = {
			name: 'KA Applegate'
		};
		const payload = await Book.insertOne({
			title: 'The Message',
			author
		});
		expect(payload.item.title).toBe('The Message');
		expect(payload.item.author.id).toBeDefined();
		expect(payload.item.author.name).toBe('KA Applegate');
	});
});

describe('find/query', () => {
	let Post;
	let Author;
	beforeAll(async done => {
		({Post, Author} = db.repository);
		await Post.insertOne({
			title: 'No one is safe',
			author: 2,
			tags: ['post', 'documentation']
		});
		done();
	});

	it('find Post including populated relations and arrays', async () => {
		expect.assertions(2);
		const postPayload = await Post.find({title: 'No one is safe'});
		expect(postPayload.items[0].author.id).toBe(2);
		expect(postPayload.items[0].tags).toContain('post');
	});

	it('findOne Post including populated relations and arrays', async () => {
		expect.assertions(2);
		const postPayload = await Post.findOne({title: 'No one is safe'});
		expect(postPayload.item.author.id).toBe(2);
		expect(postPayload.item.tags).toContain('post');
	});
});

describe('update/delete', () => {
	let Post;
	let Author;
	beforeAll(async done => {
		({Post, Author} = db.repository);
		await Post.insertOne({
			title: 'The Cuckoo Clock of Doom',
			author: 3,
			tags: ['horror', 'clock']
		});
		await Post.insertOne({
			title: 'Stay Out of the Basement',
			author: 3,
			tags: ['horror', 'clock']
		});

		done();
	});

	it('updateOne post', async () => {
		expect.assertions(2);
		const updatedPost = await Post.updateOne(
			{title: 'The Cuckoo Clock of Doom'},
			{title: 'Cuckoo Clock of Doom'}
		);
		expect(updatedPost.item.title).toBe('Cuckoo Clock of Doom');
		expect(updatedPost.item.tags).toContain('horror');
	});

	it('deleteOne post', async () => {
		expect.assertions(1);
		await Post.deleteOne({title: 'Stay Out of the Basement'});
		const postPayload = await Post.findOne({
			title: 'Stay Out of the Basement'
		});
		expect(postPayload.item).toBeNull();
	});
});

afterAll(async done => {
	await db.disconnect();
	done();
});
