// Imports
const http = require("http");
const fs = require("fs")
const readline = require("readline");
const crypto = require("crypto");

// Server settings
const hostname = "127.0.0.1";
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
	return str.replace(new RegExp(find, "g"), replace);
}

// Turn a url-like string into a nicer form
function processQuestion(q) {

	// Decode it
	q = decodeURIComponent(q);

	// Replace various things
	q = replaceAll(q, "\\?", " ");
	q = replaceAll(q, "!", " ");
	q = replaceAll(q, ",", " ");
	q = replaceAll(q, "\\.", " ");

	// Return the modified question
	return q;

}

// Turn a url-like string into a nicer form
function processAnswer(q) {

	// Decode it
	q = decodeURIComponent(q);

	// Return the modified answer
	return q;

}

// Create the server object
const server = http.createServer(async function (req, res) {

	// If asking for the main page
	if (req.url == "/") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/html");

		// Send the page
		res.end(indexHTML);

	// If asking for the main logo
	} else if (req.url == "/logo.svg") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader("Content-Type", "image/svg+xml");

		// Send the page
		res.end(logoSVG);

	// If asking for the favicon logo
	} else if (req.url == "/favicon.ico") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader("Content-Type", "image/svg+xml");

		// Send the page
		res.end(iconSVG);

	// If editting a response
	} else if (req.url == "/edit") {

		// Hash the user's ip
		var ipHash = hash(req.socket.remoteAddress);

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/plain");

		// When the post data is recieved
		req.on("data", data => {

			// Extract the question and the answer
			var qAndA = data.toString("utf8").split("~#~#~");

			// Process the question and answer
			var question = processQuestion(qAndA[0]);
			var answer = processAnswer(qAndA[1]);
			var inFile = question + "\n" + answer;

			// Hash the question and its directory
			var questionHash = hash(question);
			var dirQuestion = "./q/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/";
			var dirIPs = "./i/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/";
			var pathQuestion = "./q/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/" + questionHash;
			var pathIPs = "./i/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/" + questionHash;

			// For debugging
			console.log("edit: " + questionHash);

			// See if this file exists
			fs.exists(pathQuestion, function (doesExist) {

				// If the question exists
				if (doesExist) {

					// Check if an IP file exists
					fs.exists(pathIPs, function (doesExist) {

						// If it does, check if they can edit
						if (doesExist) {

							// Read the IP file
							fs.readFile(pathIPs, "utf8" , (err, data) => {
								if (err) throw err;

								// Stop if this IP hash in this file
								var listIP = data.split("\n");
								for (var i=0; i<listIP.length; i++) {
									if (listIP[i] == ipHash) {
										console.log("user was already in the ip file");
										res.end("no");
										return;
									}
								}

								// Output for debugging
								console.log("rewrote question file, added to ip file");

								// Rewrite the question file
								fs.writeFile(pathQuestion, inFile, function(err) {
									if (err) throw err;
								});

								// Add their IP to the IP file
								fs.appendFile(pathIPs, ipHash + "\n", function (err) {
									if (err) throw err;
								});

								// Everything went fine
								res.end("yes");

							});
							
						// If it doesn't, let them edit
						} else {

							// Output for debugging
							console.log("rewrote question file, created ip file");

							// Rewrite the question file
							fs.writeFile(pathQuestion, inFile, function(err) {
								if (err) throw err;
							});
							
							// Create the path for the ip list
							fs.mkdir(dirIPs, {recursive: true}, (err) => {
								if (err) throw err;

								// Create the ip file
								fs.writeFile(pathIPs, ipHash, function(err) {
									if (err) throw err;
								});

							});

							// Everything went fine
							res.end("yes");

						}

					});

				// If it doesn't, allow the change
				} else {

					// Output for debugging
					console.log("created new question and ip files");

					// Create the path for the question
					fs.mkdir(dirQuestion, {recursive: true}, (err) => {
						if (err) throw err;

						// Create the question file
						fs.writeFile(pathQuestion, question + "\n" + answer, function(err) {
							if (err) throw err;
						});

					});

					// Create the path for the ip list
					fs.mkdir(dirIPs, {recursive: true}, (err) => {
						if (err) throw err;

						// Create the ip file
						fs.writeFile(pathIPs, ipHash, function(err) {
							if (err) throw err;
						});

					});

					// Everything went fine
					res.end("yes");

				}

			});

		});

	// If asking a question
	} else {

		// Process the question
		var question = processQuestion(req.url.substr(1, req.url.length-1));

		// Hash the question and its directory
		var questionHash = hash(question);
		var path = "./q/" + questionHash[0] + "/" + questionHash[1] + "/" + questionHash[2] + "/" + questionHash;

		// For debugging
		console.log("request: " + questionHash);

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/plain");

		// See if this file exists
		fs.exists(path, function (doesExist) {

			// If the file exists, read it and return the response
			if (doesExist) {

				// Read the file
				fs.readFile(path, "utf8" , (err, data) => {

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

						// First line is the question, the second is the answer
						res.end(data.split("\n")[1]);

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

