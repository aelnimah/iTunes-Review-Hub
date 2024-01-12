// Importing necessary Node.js modules
const path = require('path');
const url = require('url');
const fs = require('fs');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

// Setting up SQLite databases for users and reviews
let udb = new sqlite3.Database('./data/users.db');
let rdb = new sqlite3.Database('./data/reviews.db');

// Paths to HTML files for registration and user list
const registerFilePath = path.join(__dirname, '..', 'public', 'register.html');
const usersFilePath = path.join(__dirname, '..', 'public', 'users.html');

// Middleware for BASIC HTTP authentication
exports.authenticate = function(request, response, next) {
    let auth = request.headers.authorization;
    if (!auth) {
        // If no authorization header, prompt for login
        response.setHeader('WWW-Authenticate', 'Basic realm="need to login"');
        response.writeHead(401, {'Content-Type': 'text/html'});
        console.log('No authorization found, send 401.');
        response.end();
    } else {
        // Decode authorization header to retrieve username and password
        var tmp = auth.split(' ');
        var buf = Buffer.from(tmp[1], 'base64');
        var plain_auth = buf.toString();
        var credentials = plain_auth.split(':');
        var username = credentials[0];
        var password = credentials[1];

        // Check database for user credentials
        udb.all("SELECT userid, password, role FROM users", function(err, rows) {
            var authorized = rows.some(row => row.userid === username && row.password === password);
            if (!authorized) {
                // If not authorized, send 401 response
                response.setHeader('WWW-Authenticate', 'Basic realm="need to login"');
                response.writeHead(401, {'Content-Type': 'text/html'});
                console.log('No authorization found, send 401.');
                response.end();
            } else {
                // If authorized, proceed to next middleware
                next();
            }
        });
    }
};

// Error handling function for file reading errors
function handleError(response, err) {
    console.log('ERROR: ' + JSON.stringify(err));
    response.writeHead(404);
    response.end(JSON.stringify(err));
}

// Function to handle registration requests
exports.register = function(request, response) {
    if (request.method === 'POST') {
        // If it's a POST request, handle user registration
        const { userid, password } = request.body;
        const role = 'guest'; // Default role for new users

        // Insert new user into the database
        udb.run('INSERT INTO users (userid, password, role) VALUES (?, ?, ?)', [userid, password, role], (err) => {
            if (err) {
                // Handle any errors during registration
                response.writeHead(500, {'Content-Type': 'text/html'});
                response.end('<h2>Error registering user</h2>');
                return console.error(err.message);
            }
            // If registration is successful
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end('<h2>User registered successfully</h2>');
        });
    } else {
        // If it's a GET request, serve the registration form
        fs.readFile(registerFilePath, function(err, data) {
            if (err) {
                handleError(response, err);
                return;
            }
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end(data);
        });
    }
};

// Function to send user list as HTML
function send_users(request, response, rows) {
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.write('<h2>User List</h2>');
    response.write('<ul>');
    rows.forEach(row => {
        response.write(`<li>User ID: ${row.userid}, Password: ${row.password}</li>`);
    });
    response.write('</ul>');
    response.end();
}

// Function to handle user list requests
exports.users = function(request, response) {
    // Check user role
    if(request.user_role !== 'admin'){
        // If not admin, restrict access
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('<h2>ERROR: Admin Privileges Required To See Users</h2>');
        response.end();
        return;
    }
    // If admin, retrieve and send user list
    udb.all("SELECT userid, password FROM users", function(err, rows) {
        send_users(request, response, rows);
    });
};

// Function to handle song search requests
exports.songsearch = function(request, response) {
    // Serve the song search HTML page
    // This is typically called after successful authentication
    response.sendFile(path.join(__dirname, '../public', 'songsearch.html'));
};

// Function to handle music API requests
exports.music = function(req, res) {
    // Extract the song name from the query parameters
    let songname = req.query.title;

    // If no song name is provided, return an error message
    if (!songname) {
        return res.json({ message: 'Please enter a song name' });
    }

    // Replace spaces with plus signs for the API request
    const titleWithPlusSigns = songname.split(' ').join('+');

    // Set up the request options for the iTunes API
    const options = {
        method: "GET",
        hostname: "itunes.apple.com",
        path: `/search?term=${titleWithPlusSigns}&entity=musicTrack&limit=3`
    };

    // Make an HTTP request to the iTunes API
    http.request(options, function(apiResponse) {
        let songData = '';

        // Collect data chunks as they are received
        apiResponse.on('data', chunk => songData += chunk);

        // Once all data is received, parse and send it as JSON
        apiResponse.on('end', () => res.json(JSON.parse(songData)));
    }).end();
};

// Function to handle requests for viewing reviews
exports.reviews = function(request, response) {
    // Extract the song name from the query parameters
    const songName = request.query.song;

    // Retrieve reviews for the specified song from the database
    rdb.all("SELECT * FROM reviews WHERE song_name = ?", [songName], (err, reviews) => {
        if (err) {
            // Handle any database query errors
            console.error("Database query error: ", err);
            response.send("Error retrieving reviews");
            return;
        }

        // Path to the reviews HTML file
        const reviewsFilePath = path.join(__dirname, '../public', 'reviews.html');

        // Read the reviews HTML file
        fs.readFile(reviewsFilePath, 'utf8', (err, html) => {
            if (err) {
                // Handle any file reading errors
                response.send("Error loading page");
                return;
            }

            // Prepare the reviews HTML content
            let reviewsHtml = reviews.length > 0
                ? reviews.map(review => `<p>${review.user_id}: ${review.review_text}</p>`).join('')
                : '<p>Submit a review to see others.</p>';

            // Replace placeholders in the HTML with actual reviews and song name
            let modifiedHtml = html.replace('<!--REVIEW_PLACEHOLDER-->', reviewsHtml)
                                   .replace('<!--SONG_NAME_PLACEHOLDER-->', songName);

            // Send the modified HTML as the response
            response.send(modifiedHtml);
        });
    });
};

// Function to handle review submission
exports.submitReview = function(request, response) {
    // Extract review details from the request body
    const { songName, userId, reviewText } = request.body;

    // Insert the new review into the database
    rdb.run("INSERT INTO reviews (song_name, user_id, review_text) VALUES (?, ?, ?)", [songName, userId, reviewText], (err) => {
        if (err) {
            // Handle any errors during insertion
            console.log(err);
            response.send("Error submitting review");
            return;
        }
        // Log the submitted song name
        console.log("SongName: ", songName);

        // Redirect the user to the reviews page for the song
        response.redirect(`/reviews?song=${encodeURIComponent(songName)}`);
    });
};