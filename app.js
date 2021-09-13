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

// Compare two questions and give a score TODO
function scoreFunction(question1, question2) {

	// Between zero and one
	var score = 0;

	// Get the number of words that are the same TODO
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

	// If asking a question
	} else if (req.url[1] == "q") {

		// Process the question into words
		var question = req.url.substring(2, 140);
		question = replaceAll(question, "%20", " ");
		question = replaceAll(question, "\\?", " ");
		question = replaceAll(question, "!", " ");
		question = replaceAll(question, ",", " ");
		question = replaceAll(question, "\\.", " ");
		var split = question.split(" ");
		console.log(question);

		// The default response
		var bestMatch = ["", "I don't know how to respond to that, press edit to tell me"];
		var hasFound = false;

		// Search the cache
		for (var i=0; i<cache.length; i++) {
			var val = scoreFunction(split, cache[i][0]);
			if (val > minScore) {
				bestMatch = cache[i];
				hasFound = true;
				console.log("found in cache");
				break;
			}
		}
		
		// If not in the cache
		if (!hasFound) {

			// Create an access point to the data file
			const fileStream = fs.createReadStream("data.csv", {highWaterMark: chunkSize});
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity
			});

			// Get a certain amount of data from the file at once
			for await (const data of rl) {

				// Put this into an object form
				var qAndA = data.split("~");
				var tempCache = [];
				for (var i=0; i<qAndA.length; i+=2) {
					tempCache.push({q: qAndA[i], a: qAndA[i+1]});
				}

				// Search the temp cache TODO tempCache[i][0] can be undefined
				for (var i=0; i<tempCache.length; i++) {
					var val = scoreFunction(tempCache[i][0], split);
					if (val > minScore) {
						bestMatch = tempCache[i];
						hasFound = true;
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
		if (hasFound) {
			cache.unshift(bestMatch);
			if (cache.length > cacheSize) {
				cache.pop();
			}
		} else {
			console.log("couldn't find anywhere");
		}

		// Set HTTPS header info
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/plain');

		// Send the response
		res.end(bestMatch[1]);
		
	// If an edit request TODO
	} else if (req.url[1] == "e") {

	}

});

// Start the server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});

