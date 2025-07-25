const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');

// ✅ ROOT: Show homepage (home.ejs)
router.get('/', (req, res) => {
    res.render('home');
});

// ✅ GET registration page
router.get('/register', (req, res) => {
    const success = req.session.success || '';
    const error = req.session.error || '';
    const email = req.session.email || '';
    const username = req.session.username || '';

    // clear session flash messages
    req.session.success = '';
    req.session.error = '';
    req.session.email = '';
    req.session.username = '';

    res.render('register', { success, error, email, username });
});

// ✅ POST registration
router.post(
    '/register',
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
        body('currency').notEmpty().withMessage('Currency is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { username, email, password, currency } = req.body;

        if (!errors.isEmpty()) {
            const msg = errors.array()[0].msg;
            req.session.error = msg;
            req.session.email = email;
            req.session.username = username;
            return res.redirect('/register');
        }

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                req.session.error = 'Email already registered';
                req.session.email = email;
                req.session.username = username;
                return res.redirect('/register');
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

            req.session.success = 'Registration successful. ';
            return res.redirect('/register');
        } catch (err) {
            console.error('Registration error:', err);
            req.session.error = 'Server error';
            req.session.email = email;
            req.session.username = username;
            return res.redirect('/register');
        }
    }
);

// ✅ GET login page
router.get('/login', (req, res) => {
    res.render('login', { error: '', email: '' });
});

// ✅ POST login
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
            return res.render('login', {
                error: msg,
                email
            });
        }

        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('login', {
                    error: 'User not found',
                    email
                });
            }

            if (user.isAdmin === true) {
                return res.render('login', {
                    error: 'Admins must log in from the admin portal',
                    email
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('login', {
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
            res.render('login', {
                error: 'Server error',
                email
            });
        }
    }
);

// ✅ GET logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;