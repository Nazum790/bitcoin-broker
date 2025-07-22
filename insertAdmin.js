require('dotenv').config(); // ✅ Load environment variables

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

async function insertAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI); // ✅ Corrected here
        console.log('✅ Connected to MongoDB');

        const email = 'admin@example.com';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log('⚠ Admin already exists in the database.');
            return process.exit(0);
        }

        // Create new admin
        const admin = new User({
            username: 'admin',
            email: email,
            password: '$2y$10$6g/BCXLdpcQnM7bPt6J.gOFqs2qiTABC0B0U6ZSFUFCHX3u/8eL16', // Your strong hashed password
            currency: 'USD',
            isAdmin: true,
            transactions: []
        });

        await admin.save();
        console.log('✅ Admin created successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error inserting admin:', error);
        process.exit(1);
    }
}

insertAdmin();