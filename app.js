// Imports
const http = require("http");
const fs = require("fs")
const readline = require("readline");
const crypto = require("crypto");
const schedule = require('node-schedule');

// Server settings
const hostname = "172.31.16.214";
const port = 8080;
const maxQuestionLength = 40;
const maxAnswerLength = 250;

// Load the files needed into memory
const indexHTML = fs.readFileSync("index.html", "utf8");
const logoSVG = fs.readFileSync("logo.svg", "utf8");

// Generate a random salt
var salt = genSalt();

// Generate a random salt
function genSalt() {
	return (Math.random() + 1).toString(36).substring(7);
}

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
	try {
		q = decodeURIComponent(q);
	} catch (e) {
		return "";
	}

	// Max length
	q = q.substr(0, maxQuestionLength);

	// Insist on lowercase
	q = q.toLowerCase();

	// Replace various things
	q = replaceAll(q, "[\\?!,'-\\.]", "");

	// Strip the leading and trailing spaces 
	q = q.trim();

	// Return the modified question
	return q;

}

// Turn a url-like string into a nicer form
function processAnswer(q) {

	// Decode it
	try {
		q = decodeURIComponent(q);
	} catch (e) {
		return "";
	}

	// Max length
	q = q.substr(0, maxAnswerLength);

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

	// If editting a response
	} else if (req.url == "/edit") {

		// Hash the user's ip
		var ipHash = hash(req.socket.remoteAddress+salt);

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

			// Ensure it has at least something
			if (question.length == 0 || answer.length == 0) {
				return;
			}

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
							fs.readFile(pathIPs, "utf8" , (err, data) => {
								if (err) throw err;

								// Stop if this IP hash in this file
								var listIP = data.split("\n");
								for (var i=0; i<listIP.length; i++) {
									if (listIP[i] == ipHash) {
										res.end("no");
										return;
									}
								}

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

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/plain");

		// See if this file exists
		fs.exists(path, function (doesExist) {

			// If the file exists, read it and return the response
			if (doesExist) {

				// Read the file
				fs.readFile(path, "utf8" , (err, data) => {
					if (err) throw err;

					// First line is the question, the second is the answer
					res.end(data.split("\n")[1]);

				})

			// If it doesn't return the default response
			} else {

				// Send the default response
				res.end("");

			}

		});

	}

});

// Delete the ip list directory
function resetIPLists() {
	fs.rmSync("./i/", {recursive: true, force: true});
	salt = genSalt();
}

// Start the server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});

// Every 24 hours, reset the ip lists
const job = schedule.scheduleJob("0 0 * * *", resetIPLists);

