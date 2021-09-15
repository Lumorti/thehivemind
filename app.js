// Imports
const http = require('http');
const fs = require('fs')
const readline = require('readline');

// Server settings
const hostname = '127.0.0.1';
const port = 3000;
const cacheSize = 100;
const minScore = 0.7;
const chunkSize = 10000000;

// Load the files needed into memory
const indexHTML = fs.readFileSync("index.html", "utf8");
const logoSVG = fs.readFileSync("logo.svg", "utf8");

// The cache
var cache = [];

// Compare two questions and give a score
function scoreFunction(question1, question2) {

	// Between zero and one
	var score = 0;

	// Get the number of words that are the same
	var numSame = 0;
	for (var i=0; i<question1.length; i++) {
		for (var j=0; j<question2.length; j++) {
			if (question1[i] == question2[j]) {
				numSame += 1;
				continue;
			}
		}
	}

	// Turn this into a percentage
	score = numSame / question1.length;

	// Return the score
	return score;

};

// Utility function to replace all occurences in a string
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(find, 'g'), replace);
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

	// If asking for the favicon logo TODO
	} else if (req.url == "/favicon.ico") {

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'image/svg+xml');

		// Send the page
		res.end(logoSVG);

	// If editting a response TODO
	} else if (req.url == "/edit") {

		console.log("edit request");

	// If asking a question
	} else {

		// Process the question into words
		var question = decodeURIComponent(req.url.substring(1, 140));
		question = replaceAll(question, "%20", " ");
		question = replaceAll(question, "\\?", " ");
		question = replaceAll(question, "!", " ");
		question = replaceAll(question, ",", " ");
		question = replaceAll(question, "\\.", " ");
		var split = question.split(" ");

		// Output the user's question
		console.log("request: " + question);

		// The default response
		var bestMatch = {q: [], a: "I don't know how to respond to that, press edit to tell me"};
		var hasFound = 0;

		// Find a certain number of candidates then pick the best one TODO

		// Search the cache
		for (var i=0; i<cache.length; i++) {
			var val = scoreFunction(split, cache[i].q);
			if (val > minScore) {
				bestMatch = cache[i];
				hasFound = 1;
				console.log("found in cache");
				break;
			}
		}
		
		// If not in the cache
		if (hasFound == 0) {

			// Create an access point to the data file
			const fileStream = fs.createReadStream("data.csv", {highWaterMark: chunkSize});

			// Get a certain amount of data from the file at once
			for await (const data of fileStream) {

				// Put this into an object form
				var qAndA = data.toString().split("\n");
				var tempCache = [];
				var splitLoc = 0;
				for (var i=0; i<qAndA.length-1; i++) {
					splitLoc = qAndA[i].indexOf("~");
					tempCache.push({q: qAndA[i].substr(0, splitLoc-1).split(" "), a: qAndA[i].substr(splitLoc+2, qAndA[i].length)});
				}

				// Search the temp cache
				for (var i=0; i<tempCache.length; i++) {
					var val = scoreFunction(split, tempCache[i].q);
					if (val > minScore) {
						bestMatch = tempCache[i];
						hasFound = 2;
						break;
					}
				}

				// If found something good enough, stop
				if (hasFound) {
					console.log("found in file");
					break;
				}

			}

		}

		// Move this to the top of the cache
		if (hasFound == 2) {
			cache.unshift(bestMatch);
			if (cache.length > cacheSize) {
				cache.pop();
			}
		} else if (hasFound == 0) {
			console.log("couldn't find anywhere");
		}

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/plain');

		// Send the response
		res.end(bestMatch.a);

	}

});

// Start the server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});

