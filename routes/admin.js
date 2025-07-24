const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');

// Middleware to protect admin routes
function isAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    res.redirect('/admin/login');
}

// Redirect /admin to /admin/login
router.get('/', (req, res) => {
    res.redirect('/admin/login');
});

// GET admin login page
router.get('/login', (req, res) => {
    res.render('admin/admin_login', {
        error: req.query.error || '',
    });
});

// POST admin login
router.post('/login',
    [
        body('email').isEmail().withMessage('Invalid email'),
        body('password').notEmpty().withMessage('Password required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const msg = errors.array()[0].msg;
            return res.redirect(`/admin/login ? error = ${encodeURIComponent(msg)}`);
        }

        const { email, password } = req.body;

        try {
            const admin = await User.findOne({ email, isAdmin: true });
            if (!admin) {
                return res.redirect('/admin/login?error=Admin not found');
            }

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.redirect('/admin/login?error=Invalid credentials');
            }

            req.session.admin = {
                id: admin._id,
                email: admin.email
            };

            res.redirect('/admin/dashboard');

        } catch (err) {
            console.error('Admin login error:', err);
            res.redirect('/admin/login?error=Server error');
        }
    }
);

// GET admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).sort({ createdAt: -1 });
        res.render('admin/admin_dashboard', { users });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.redirect('/admin/login?error=Failed to load dashboard');
    }
});

// GET withdrawals
router.get('/withdrawals', isAdmin, async (req, res) => {
    try {
        const users = await User.find({ 'transactions.0': { $exists: true } });

        const allWithdrawals = [];
        users.forEach(user => {
            user.transactions.forEach(tx => {
                if (tx.type === 'withdrawal') {
                    allWithdrawals.push({
                        _id: tx._id,
                        username: user.username,
                        email: user.email,
                        currency: user.currency,
                        amount: tx.amount,
                        status: tx.status,
                        date: tx.date,
                        pixKey: tx.pixKey
                    });
                }
            });
        });

        allWithdrawals.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.render('admin/admin_withdrawals', { withdrawals: allWithdrawals });

    } catch (err) {
        console.error('Admin withdrawals error:', err);
        res.redirect('/admin/dashboard?error=Failed to load withdrawals');
    }
});

// POST approve withdrawal
router.post('/withdrawals/:id/approve', isAdmin, async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const users = await User.find({ 'transactions._id': withdrawalId });

        if (!users.length) {
            return res.redirect('/admin/withdrawals?error=Withdrawal not found');
        }

        const user = users[0];
        const transaction = user.transactions.id(withdrawalId);

        if (!transaction) {
            return res.redirect('/admin/withdrawals?error=Transaction not found');
        }

        if (transaction.status === 'approved') {
            return res.redirect('/admin/withdrawals?error=Already approved');
        }

        transaction.status = 'approved';
        await user.save();

        res.redirect('/admin/withdrawals?success=Withdrawal approved');
    } catch (err) {
        console.error('Approve error:', err);
        res.redirect('/admin/withdrawals?error=Failed to approve withdrawal');
    }
});

// POST decline withdrawal
router.post('/withdrawals/:id/decline', isAdmin, async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const users = await User.find({ 'transactions._id': withdrawalId });

        if (!users.length) {
            return res.redirect('/admin/withdrawals?error=Withdrawal not found');
        }

        const user = users[0];
        const transaction = user.transactions.id(withdrawalId);

        if (!transaction) {
            return res.redirect('/admin/withdrawals?error=Transaction not found');
        }

        if (transaction.status === 'declined') {
            return res.redirect('/admin/withdrawals?error=Already declined');
        }

        transaction.status = 'declined';
        await user.save();

        res.redirect('/admin/withdrawals?success=Withdrawal declined');
    } catch (err) {
        console.error('Decline error:', err);
        res.redirect('/admin/withdrawals?error=Failed to decline withdrawal');
    }
});

// Admin logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Admin logout error:', err);
        res.redirect('/admin/login');
    });
});

// POST update balance
router.post('/update-balance',
    isAdmin,
    [
        body('userId').isMongoId().withMessage('Invalid user ID'),
        body('newBalance').isFloat({ min: 0 }).withMessage('Invalid balance')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const msg = errors.array()[0].msg;
            return res.redirect(`/admin/dashboard ? error = ${encodeURIComponent(msg)}`);
        }

        const { userId, newBalance } = req.body;

        try {
            await User.findByIdAndUpdate(userId, {
                balance: parseFloat(newBalance)
            });
            res.redirect('/admin/dashboard?success=Balance updated');
        } catch (err) {
            console.error('Balance update error:', err);
            res.redirect('/admin/dashboard?error=Failed to update balance');
        }
    }
);

module.exports = router;