const express = require('express');
const router = express.Router();

// Render login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Render register page
router.get('/register', (req, res) => {
  res.render('register');
});

// Handle login POST
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  // TODO: Validate user with DB
  if (email === 'test@example.com' && password === '123456') {
    return res.send('Login successful!');
  }
  res.send('Invalid login');
});

// Handle register POST
router.post('/register', (req, res) => {
  const { email, password } = req.body;
  // TODO: Save user to DB
  res.send(`User registered: ${email}`);
});

module.exports = router;
