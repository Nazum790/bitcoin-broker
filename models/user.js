// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    currency: { type: String, required: true },
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },

    transactions: [
        {
            type: {
                type: String,
                enum: ['withdrawal'],
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            status: {
                type: String,
                enum: ['pending', 'approved', 'declined'],  // ✅ lowercase
                default: 'pending'                           // ✅ lowercase
            },
            date: {
                type: Date,
                default: Date.now
            },
            pixKey: {
                type: String,
                required: true
            }
        }
    ]
});

const User = mongoose.model('User', userSchema);
module.exports = User;