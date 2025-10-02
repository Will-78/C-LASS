// bootstrap.js

// Load header
fetch('header.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('header').innerHTML = html;

    // Hamburger toggle for mobile
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('nav-links-open');
        toggle.classList.toggle('open');
      });
    }
  })
  .catch(err => console.error('Failed to load header:', err));


// Load footer (keeping your teammate's code exactly as is)
fetch('footer.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('footer').innerHTML = html;
  })
  .catch(err => console.error('Failed to load footer:', err));
