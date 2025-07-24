// routes/auth.js

const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/user');

// ===============================
// Home Page
// ===============================
router.get('/', (req, res) => {
    res.render('home');
});

// ===============================
// Show Registration Page
// ===============================
router.get('/register', (req, res) => {
    res.render('register', {
        error: req.query.error,
        success: req.query.success,
        email: req.query.email || '',
        username: req.query.username || ''
    });
});

// ===============================
// Handle User Registration
// ===============================
router.post(
    '/register',
    [
        body('username').trim().escape().notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
        body('currency').trim().escape()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { username, email, password, currency } = req.body;

        if (!errors.isEmpty()) {
            const msg = encodeURIComponent(errors.array()[0].msg);
            return res.redirect(`/register?error=${msg}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
        }

        try {
            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                const msg = existingUser.email === email ? 'Email already registered' : 'Username already taken';
                return res.redirect(`/register?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            await User.create({
                username,
                email,
                password: hashedPassword,
                currency,
                balance: 0,
                transactions: [],
                isAdmin: false
            });

            const successMsg = encodeURIComponent('Registration successful! Click to sign in');
            res.redirect(`/register?success=${successMsg}`);
        } catch (err) {
            console.error('Registration error:', err);
            const errMsg = encodeURIComponent('Registration failed. Please try again.');
            res.redirect(`/register?error=${errMsg}`);
        }
    }
);

// ===============================
// Show Login Page
// ===============================
router.get('/login', (req, res) => {
    res.render('login', {
        error: req.query.error,
        email: req.query.email || ''
    });
});

// ===============================
// Handle Login (Users Only)
// ===============================
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { email, password } = req.body;

        if (!errors.isEmpty()) {
            const msg = encodeURIComponent(errors.array()[0].msg);
            return res.redirect(`/login?error=${msg}&email=${encodeURIComponent(email)}`);
        }

        try {
            const user = await User.findOne({ email });
            if (!user) {
                const msg = encodeURIComponent('Invalid email or password');
                return res.redirect(`/login?error=${msg}&email=${encodeURIComponent(email)}`);
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                const msg = encodeURIComponent('Invalid email or password');
                return res.redirect(`/login?error=${msg}&email=${encodeURIComponent(email)}`);
            }

            // ❌ Reject admins trying to log in from user login page
            if (user.isAdmin === true) {
                const msg = encodeURIComponent('Admins must log in from the admin panel');
                return res.redirect(`/login?error=${msg}&email=${encodeURIComponent(email)}`);
            }

            // ✅ Store user session
            req.session.user = {
                id: user._id,
                username: user.username,
                email: user.email,
                currency: user.currency,
                balance: user.balance,
                transactions: user.transactions || [],
                isAdmin: user.isAdmin
            };

            return res.redirect('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            const errMsg = encodeURIComponent('Login failed');
            return res.redirect(`/login?error=${errMsg}`);
        }
    }
);

// ===============================
// Logout
// ===============================
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;