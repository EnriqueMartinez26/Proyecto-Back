require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found. Creating one...');
            admin = await User.create({
                name: 'System Admin',
                email: 'admin@4fun.com',
                password: 'password123',
                role: 'admin',
                isVerified: true
            });
        } else {
            admin.password = 'password123';
            await admin.save();
        }
        console.log(`Admin email: ${admin.email}`);
        console.log(`Admin password: password123`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
