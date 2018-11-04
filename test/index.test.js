let server = {};

beforeAll(async () => {
    const express = require('express');
    const app = express();
    const ormMiddleware = await require('./setup')
    app.use(ormMiddleware);
    server = app.listen(4000)
    return
});

it("test", () => {
    expect(2).toBe(2);
})

afterAll(() => {
    server.close()
})