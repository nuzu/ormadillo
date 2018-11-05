let db = null;

beforeAll(async done => {
	({db} = await require('./setup'));
	done();
});

describe('set up environment', () => {
	it('database is connected', () => {
		expect(db.isConnected).toBe(true);
	});
	it('Post mapper created', () => {
		expect(db).toHaveProperty('Post');
	});
	it('Author mapper created', () => {
		expect(db).toHaveProperty('Author');
	});
});

describe('insert/create', () => {
	let Post; let Author;
	beforeAll(() => {
		({Post, Author} = db);
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
		const post = new Post({random: 'not random'});
		const validated = await post.validate();
		expect(validated).toBe(false);
	});

	it('expect validation to succeed', async () => {
		expect.assertions(1);
		const post = new Post({title: 'Javascript works', author: 2});
		const validated = await post.validate();
		expect(validated).toBe(true);
	});

	it('insert and update by save', async () => {
		expect.assertions(2);
		const post = new Post({title: 'Javascript works', author: 2});
		const saved_post = await post.save();
		expect(saved_post.title).toBe(post.title);
		saved_post.title = 'Python works too';
		const updated_post = await saved_post.save();
		expect(updated_post.title).toBe('Python works too');
	});

	it('insert by insertOne', async () => {
		expect.assertions(1);
		const inserted_post = await Post.insertOne({title: 'When worlds collide', author: 1});
		expect(inserted_post.item.title).toBe('When worlds collide');
	});
});

describe('find/query', () => {
	let Post; let Author;
	beforeAll(async done => {
		({Post, Author} = db);
		await Post.insertOne({title: 'No one is safe', author: 2, tags: ['post', 'documentation']});
		done();
	});

	it('find Post including populated relations and arrays', async () => {
		expect.assertions(2);
		const found_post_payload = await Post.find({title: 'No one is safe'});
		expect(found_post_payload.items[0].author.id).toBe(2);
		expect(found_post_payload.items[0].tags).toContain('post');
	});

	it('findOne Post including populated relations and arrays', async () => {
		expect.assertions(2);
		const found_post_payload = await Post.findOne({title: 'No one is safe'});
		expect(found_post_payload.item.author.id).toBe(2);
		expect(found_post_payload.item.tags).toContain('post');
	});
});

describe('update/delete', () => {
	let Post; let Author; let inserted_post;
	beforeAll(async done => {
		({Post, Author} = db);
		inserted_post = await Post.insertOne({title: 'The Cuckoo Clock of Doom', author: 3, tags: ['horror', 'clock']});
		inserted_post = await Post.insertOne({title: 'Stay Out of the Basement', author: 3, tags: ['horror', 'clock']});

		done();
	});

	it('updateOne post', async () => {
		expect.assertions(2);
		const updated_post = await Post.updateOne({title: 'The Cuckoo Clock of Doom'}, {title: 'Cuckoo Clock of Doom'});
		expect(updated_post.item.title).toBe('Cuckoo Clock of Doom');
		expect(updated_post.item.tags).toContain('horror');
	});

	it('deleteOne post', async () => {
		expect.assertions(1);
		await Post.deleteOne({title: 'Stay Out of the Basement'});
		const payload_for_search = await Post.findOne({title: 'Stay Out of the Basement'});
		expect(payload_for_search.item).toBeNull();
	});
});

afterAll(async done => {
	await db.disconnect();
	done();
});
