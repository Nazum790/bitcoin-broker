const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');

// ✅ ROOT: Show homepage (home.ejs)
router.get('/', (req, res) => {
    res.render('home');
});

// GET registration page
router.get('/register', (req, res) => {
    res.render('auth/register', { error: '', email: '', username: '' });
});

// POST registration
router.post(
    '/register',
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('currency').notEmpty().withMessage('Currency is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { username, email, password, currency } = req.body;

        if (!errors.isEmpty()) {
            const msg = errors.array()[0].msg;
            return res.render('auth/register', {
                error: msg,
                email,
                username
            });
        }

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render('auth/register', {
                    error: 'Email already registered',
                    email,
                    username
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                isAdmin: false,
                balance: 0,
                currency,
                transactions: []
            });

            await newUser.save();

            req.session.user = {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                isAdmin: false
            };

            res.redirect('/dashboard');
        } catch (err) {
            console.error('Registration error:', err);
            res.render('auth/register', {
                error: 'Server error',
                email,
                username
            });
        }
    }
);

// GET login page
router.get('/login', (req, res) => {
    res.render('auth/login', { error: '', email: '' });
});

// POST login
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { email, password } = req.body;

        if (!errors.isEmpty()) {
            const msg = errors.array()[0].msg;
            return res.render('auth/login', {
                error: msg,
                email
            });
        }

        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('auth/login', {
                    error: 'User not found',
                    email
                });
            }

            if (user.isAdmin === true) {
                return res.render('auth/login', {
                    error: 'Admins must log in from the admin portal',
                    email
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('auth/login', {
                    error: 'Invalid credentials',
                    email
                });
            }

            req.session.user = {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: false
            };

            res.redirect('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            res.render('auth/login', {
                error: 'Server error',
                email
            });
        }
    }
);

// GET logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;