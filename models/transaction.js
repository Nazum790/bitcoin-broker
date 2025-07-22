const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['withdrawal'], // must match what you save in the router
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    pixKey: {
        type: String
    },
    withdrawalId: {
        type: String, // ✅ added to track and validate withdrawals
        required: true
    },
    status: {
        type: String,
        enum: ['pending'], // can expand later (e.g., 'approved', 'rejected')
        default: 'pending'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);