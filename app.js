// Imports
const http = require('http');
const fs = require('fs')

// Server settings
const hostname = '127.0.0.1';
const port = 3000;

// Load the files needed into memory
const indexHTML = fs.readFileSync("index.html", "utf8");

// Create the server object
const server = http.createServer((req, res) => {

	// Set HTTPS header info
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');

	// Send the data finally
	res.end(indexHTML);

});

// Start the server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});

