const server = require('fastify')({
  logger: false
})
const {Store} = require("fs-json-store");

const store = new Store({file: "data.json"});

server.get('/books', async (req, reply) => {
  return await store.read();
});

server.post('/books', async (req, reply) => {
  console.log(req.body);
  await store.write(req.body);
  reply.send(200);
});

server.listen({ port: 3000, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    await console.error(err, address);
    process.exit(1);
  }
  console.log(`web-server listening...`);
});