// Function to handle the song search operation
function getSong() {
    // Retrieve the song name from the input element
    let songname = document.getElementById('song').value;

    // If the input is empty, alert the user and stop the function
    if (songname === '') {
        return alert('Please enter a song name');
    }

    // Get the element where search results will be displayed
    let songResults = document.getElementById('songResults');
    // Clear any previous search results
    songResults.innerHTML = '';

    // Perform an AJAX request to the server to search for songs
    fetch(`/music?title=${encodeURIComponent(songname)}`)
        .then(response => response.json()) // Parse the JSON response
        .then(data => {
            // Map each song in the response to an HTML list item
            let songs = data.results.map(song => `
                <li>
                    <a href="/reviews?song=${encodeURIComponent(song.trackName)}">${song.trackName} by ${song.artistName}</a>
                </li>`).join(''); // Join all list items into a single string

            // Insert the song list items into the songResults element
            songResults.innerHTML = `<ul>${songs}</ul>`;
        })
        .catch(error => console.error('Error:', error)); // Log any errors to the console
}

// Add a click event listener to the submit button to initiate song search
document.getElementById('submit_button').addEventListener('click', getSong);

// Define the ENTER key code
const ENTER = 13;

// Function to handle keyup events
function handleKeyUp(event) {
    // If the ENTER key is pressed, initiate song search
    if (event.keyCode === ENTER) {
        getSong();
    }
}

// Once the DOM is fully loaded, add event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Re-add the click event listener to the submit button
    document.getElementById('submit_button').addEventListener('click', getSong);

    // Add a keyup event listener to the entire document
    document.addEventListener('keyup', handleKeyUp);
});