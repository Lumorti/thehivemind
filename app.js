// Imports
const http = require('http');
const fs = require('fs')

// Server settings
const hostname = '127.0.0.1';
const port = 3000;

// Load the files needed into memory
const indexHTML = fs.readFileSync("index.html", "utf8");
const logoSVG = fs.readFileSync("logo.svg", "utf8");

// Utility function to replace all occurences in a string
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

// Create the server object
const server = http.createServer((req, res) => {

	// If asking for the main page
	if (req.url == "/") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/html');

		// Send the page
		res.end(indexHTML);

	// If asking for the main logo
	} else if (req.url == "/logo.svg") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'image/svg+xml');

		// Send the page
		res.end(logoSVG);

	// If asking a question
	} else if (req.url[1] == "q") {

		// Process the question into words
		var question = req.url.substring(2);
		question = replaceAll(question, "%20", " ");
		question = replaceAll(question, "?", " ? ");
		question = replaceAll(question, "!", " ! ");
		question = replaceAll(question, ",", " , ");
		question = replaceAll(question, ".", " . ");
		var split = question.split(" ");

		console.log(split);

		// Search the cache TODO
		
		// If not in the cahce, search the file TODO

		// Return the response
		
	}

});

// Start the server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});

