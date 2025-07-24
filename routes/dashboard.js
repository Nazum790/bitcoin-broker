const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { Types } = require('mongoose'); // ✅ Required for generating transaction IDs

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login?error=Please login first');
    }
    next();
};

// Hardcoded 8-digit secret (CHANGE THIS IN PRODUCTION)
const SECRET_WITHDRAWAL_CODE = "24568011";

// GET Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login?error=User not found');
        }

        res.render('dashboard', {
            username: user.username,
            balance: user.balance,
            currency: user.currency,
            transactions: user.transactions || [],
            success: req.query.success,
            error: req.query.error
        });

    } catch (err) {
        console.error('Dashboard error:', err);
        res.redirect('/login?error=Server error');
    }
});

// GET Withdraw Page
router.get('/withdraw', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('withdraw', {
            error: req.query.error,
            success: req.query.success,
            currentBalance: user.balance,
            currency: user.currency
        });
    } catch (err) {
        console.error('Withdraw page error:', err);
        res.redirect('/dashboard?error=Cannot load withdraw page');
    }
});

// POST Handle Withdrawal
router.post('/withdraw', requireAuth, async (req, res) => {
    const { amount, withdrawalId, pixKey } = req.body;

    // Validate all fields
    if (!amount || !withdrawalId || !pixKey) {
        return res.redirect('/withdraw?error=All fields are required');
    }

    if (withdrawalId !== SECRET_WITHDRAWAL_CODE) {
        return res.redirect('/withdraw?error=Invalid withdrawal code');
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.redirect('/withdraw?error=Invalid amount');
    }

    try {
        const user = await User.findById(req.session.user.id);

        if (user.balance < numericAmount) {
            return res.redirect('/withdraw?error=Insufficient balance');
        }

        // Deduct and record transaction with unique _id and proper status
        user.balance -= numericAmount;

        user.transactions.unshift({
            _id: new Types.ObjectId(), // ✅ This fixes the missing _id issue
            type: 'withdrawal',
            amount: numericAmount,
            currency: user.currency,
            status: 'Pending', // ✅ Use capital P to match admin panel
            date: new Date(),
            pixKey: pixKey
        });

        await user.save();
        res.redirect('/dashboard?success=Withdrawal pending!');

    } catch (err) {
        console.error('Withdrawal error:', err);
        res.redirect('/withdraw?error=Withdrawal failed. Try again.');
    }
});

// GET Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/login');
    });
});

module.exports = router;