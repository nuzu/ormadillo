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
	let Post;
	let Author;
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
		const savedPost = await post.save();
		expect(savedPost.title).toBe(post.title);
		savedPost.title = 'Python works too';
		const updatedPost = await savedPost.save();
		expect(updatedPost.title).toBe('Python works too');
	});

	it('insert by insertOne', async () => {
		expect.assertions(1);
		const insertedPost = await Post.insertOne({
			title: 'When worlds collide',
			author: 1
		});
		expect(insertedPost.item.title).toBe('When worlds collide');
	});
});

describe('find/query', () => {
	let Post;
	let Author;
	beforeAll(async done => {
		({Post, Author} = db);
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
		({Post, Author} = db);
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
