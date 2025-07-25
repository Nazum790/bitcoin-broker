// routes/dashboard.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');


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

// GET user logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/login');
    });
});

// POST user request withdrawal
router.post('/withdraw', isUser, async (req, res) => {
    try {
        const { amount, pixKey } = req.body;
        const userId = req.session.user.id;

        if (!amount || amount <= 0) {
            return res.redirect('/?error=Invalid withdrawal amount');
        }
        if (!pixKey) {
            return res.redirect('/?error=Pix Key is required');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        if (user.balance < amount) {
            return res.redirect('/?error=Insufficient balance');
        }

        // Add withdrawal transaction with status 'pending'
        user.transactions.push({
            type: 'withdrawal',
            amount,
            status: 'pending',
            pixKey
        });

        // Deduct balance immediately or after approval? (choose your logic)
        // Here I do NOT deduct balance until admin approves, safer for now

        await user.save();

        res.redirect('/?success=Withdrawal request submitted');
    } catch (err) {
        console.error('Withdrawal request error:', err);
        res.redirect('/?error=Failed to submit withdrawal');
    }
});

module.exports = router;