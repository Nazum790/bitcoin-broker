// db.js
const mongoose = require('mongoose');
require('dotenv').config(); // Load .env file

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1); // Stop server if connection fails
    }
};

module.exports = connectDB;
