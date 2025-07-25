const express = require('express');
const router = express.Router();
const User = require('../models/user');

const WITHDRAWAL_SECRET = '24568011'; // Hardcoded withdrawal secret code

// Middleware to protect user routes
function isUser(req, res, next) {
    if (req.session && req.session.user && !req.session.user.isAdmin) {
        return next();
    }
    res.redirect('/login');
}

// GET user dashboard
router.get('/dashboard', isUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user) return res.redirect('/login');

        res.render('dashboard', {
            username: user.username,
            balance: user.balance,
            currency: user.currency,
            transactions: user.transactions || [],
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error('User dashboard error:', err);
        res.status(500).render('error', { error: 'Something went wrong loading the dashboard.' });
    }
});

// GET withdrawal page — show withdrawal form
router.get('/withdraw', isUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        if (!user) return res.redirect('/login');

        res.render('withdraw', {
            currentBalance: user.balance,
            currency: user.currency,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('Withdrawal page error:', err);
        res.redirect('/dashboard?error=Failed to load withdrawal page');
    }
});

// POST user withdrawal request
router.post('/withdraw', isUser, async (req, res) => {
    try {
        const { amount, pixKey, withdrawalId } = req.body;
        const userId = req.session.user.id;

        if (!amount || amount <= 0) {
            return res.redirect('/withdraw?error=Invalid withdrawal amount');
        }
        if (!pixKey) {
            return res.redirect('/withdraw?error=Pix Key is required');
        }
        if (!withdrawalId || withdrawalId !== WITHDRAWAL_SECRET) {
            return res.redirect('/withdraw?error=Invalid withdrawal secret code');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        if (user.balance < amount) {
            return res.redirect('/withdraw?error=Insufficient balance');
        }

        // Add withdrawal transaction with status 'pending'
        user.transactions.push({
            type: 'withdrawal',
            amount,
            status: 'pending',
            pixKey
        });

        // Save without deducting balance yet; admin approves first
        await user.save();

        res.redirect('/withdraw?success=Withdrawal request submitted');
    } catch (err) {
        console.error('Withdrawal request error:', err);
        res.redirect('/withdraw?error=Failed to submit withdrawal');
    }
});

// GET user logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/login');
    });
});

module.exports = router;