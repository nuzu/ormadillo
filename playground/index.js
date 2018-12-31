const http = require('http');
const fs = require('fs');
const path = require('path');

http
	.createServer((req, res) => {
		if (req.url === '/') {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(`<!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge, chrome=1" />
  <title>Ormadillo Playground</title>
  </head>
  <body>
  <div id="App"> awaiting </div>
  <script src="./build"></script>
  </body>
  </html>`);
			res.end();
		}
		if (req.url === '/build') {
			res.writeHead(200, {'Content-Type': 'text/javascript'});
			const filename = path.join(process.cwd(), './dist/main.js');
			const fileStream = fs.createReadStream(filename);
			fileStream.pipe(res);
		}
	})
	.listen(8181, () => {
		console.log('listening');
	});
