// Imports
const http = require('http');
const fs = require('fs')
const readline = require('readline');
const crypto = require('crypto');

// Server settings
const hostname = '127.0.0.1';
const port = 3000;

// Load the files needed into memory
const indexHTML = fs.readFileSync("index.html", "utf8");
const logoSVG = fs.readFileSync("logo.svg", "utf8");
const iconSVG = fs.readFileSync("favicon.svg", "utf8");

// Generic hash function (sha-256)
function hash(input) {
	return crypto.createHash("sha256").update(input).digest("hex");
}

// Utility function to replace all occurences in a string
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(find, 'g'), replace);
}

// Turn a url-like string into a nicer form
function processQuestion(q) {

	// Decode it
	q = decodeURIComponent(q.substring(1, 140));

	// Replace various things
	q = replaceAll(q, "\\?", " ");
	q = replaceAll(q, "!", " ");
	q = replaceAll(q, ",", " ");
	q = replaceAll(q, "\\.", " ");

	// Return the modified question
	return q;

}

// Create the server object
const server = http.createServer(async function (req, res) {

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

	// If asking for the favicon logo
	} else if (req.url == "/favicon.ico") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'image/svg+xml');

		// Send the page
		res.end(iconSVG);

	// If editting a response
	} else if (req.url == "/edit") {

		// Hash the user's ip
		var ipHash = hash(req.socket.remoteAddress);

		// When the post data is recieved
		req.on('data', data => {

			// Extract the question and the answer
			var qAndA = data.toString("utf8").split("~#~#~");

			// Process the question and answer
			var question = processQuestion(qAndA[0]);
			var answer = processQuestion(qAndA[1]);

			// Hash the question and its directory
			var questionHash = hash(question);
			var dirQuestion = "./q/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/";
			var dirIPs = "./i/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/";
			var pathQuestion = "./q/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/" + questionHash;
			var pathIPs = "./i/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/" + questionHash;

			// See if this file exists
			fs.exists(pathQuestion, function (doesExist) {

				// If the question exists
				if (doesExist) {

					// Check if an IP file exists
					fs.exists(pathIPs, function (doesExist) {

						// If it does, check if they can edit
						if (doesExist) {

							// Read the IP file
							fs.readFile(pathIPs, 'utf8' , (err, data) => {
								if (err) throw err;

								// Stop if this IP hash in this file
								var listIP = data.split("\n");
								for (var i=0; i<listIP; i++) {
									if (listIP[i] == ipHash) {
										return;
									}
								}

								// If it isn't, let them edit TODO

							});
							
						// If it doesn't, let them edit
						} else {

							// Rewrite the question file TODO
							
							// Create the path for the ip list
							fs.mkdir(dirIPs, {recursive: true}, (err) => {
								if (err) throw err;
							});

							// Create the ip file
							fs.writeFile(pathIPs, ipHash, function(err) {
								if (err) throw err;
							});

						}

					});

				// If it doesn't, allow the change
				} else {

					// Output for debugging
					console.log("created new file");

					// Create the path for the question
					fs.mkdir(dirQuestion, {recursive: true}, (err) => {
						if (err) throw err;
					});

					// Create the question file
					fs.writeFile(pathQuestion, answer, function(err) {
						if (err) throw err;
					});

					// Create the path for the ip list
					fs.mkdir(dirIPs, {recursive: true}, (err) => {
						if (err) throw err;
					});

					// Create the ip file
					fs.writeFile(pathIPs, ipHash, function(err) {
						if (err) throw err;
					});

				}

			});

		});

	// If asking a question
	} else {

		// Process the question
		var question = processQuestion(req.url);

		// Hash the question and its directory
		var questionHash = hash(question);
		var path = "./q/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/" + questionHash;

		// Output the user's question
		console.log("request: " + question);
		console.log("path: " + path);

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/plain');

		// See if this file exists
		fs.exists(path, function (doesExist) {

			// If the file exists, read it and return the response
			if (doesExist) {

				// Read the file
				fs.readFile(path, 'utf8' , (err, data) => {

					// If there's some error
					if (err) {

						// Output the error 
						console.error(err);

						// Send the default response
						res.end("I don't know how to respond to that, press edit to tell me");

					// If everything goes well
					} else {

						// Output for debugging
						console.log("found in file");

						// First line is the response, the rest are IP hashes
						res.end(data.split("\n")[0]);

					}

				})

			// If it doesn't return the default response
			} else {

				// Output for debugging
				console.log("path doesn't exist");

				// Send the default response
				res.end("I don't know how to respond to that, press edit to tell me");

			}

		});

	}

});

// Start the server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});

