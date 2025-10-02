// Load header
fetch('header.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('header').innerHTML = html;
    })
    .catch(err => console.error('Failed to load header:', err));

// Load footer
fetch('footer.html')
.then(response => response.text())
.then(html => {
    document.getElementById('footer').innerHTML = html;
})

.catch(err => console.error('Failed to load footer:', err));
