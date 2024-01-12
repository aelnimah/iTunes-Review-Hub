// Import necessary modules
const http = require('http');
const express = require('express');
const path = require('path'); 
const sqlite3 = require('sqlite3').verbose();
const udb = new sqlite3.Database('data/users.db'); // Connect to users database
const fs = require('fs');

const routes = require('./routes/index'); // Import routes from the routes folder

const app = express(); // Create an Express application

const PORT = process.env.PORT || 3000; // Set the port to use the environment variable or default to 3000

// Middleware for parsing request body and serving static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Makes HTML output pretty formatted (not minified)
app.locals.pretty = true;

// Route handlers for various endpoints
app.get('/register.html', routes.register); // Serve registration form for GET request
app.post('/register', routes.register); // Handle POST requests for registration

// Authentication middleware for protected routes
app.use(routes.authenticate);

// Protected routes requiring authentication
app.use('/users', routes.authenticate, routes.users); // User-related operations
app.use('/songsearch', routes.authenticate, routes.songsearch); // Song search operations
app.get('/music', routes.authenticate, routes.music); // Music API operations
app.get('/reviews', routes.authenticate, routes.reviews); // Fetch reviews
app.post('/submitReview', routes.authenticate, routes.submitReview); // Submit a new review

// Start the server and listen on the specified port
app.listen(PORT, err => {
    if(err) console.log(err);
    else {
        console.log(`Server running on port ${PORT}`);
        console.log(`To Test:`);
        console.log('Admin Login --> User: ahmed || Password: secret');
        console.log('Guest Login --> User: guest || Password: secret2');
        console.log('http://localhost:3000/register.html');
        console.log('http://localhost:3000/users');
        console.log('http://localhost:3000/songsearch');
    }
});