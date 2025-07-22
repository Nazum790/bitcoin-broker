require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

async function deleteAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const result = await User.deleteOne({ email: 'admin@example.com' });

        if (result.deletedCount > 0) {
            console.log('🗑️ Admin user deleted successfully');
        } else {
            console.log('❌ Admin not found or already deleted');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error deleting admin:', err);
        process.exit(1);
    }
}

deleteAdmin();