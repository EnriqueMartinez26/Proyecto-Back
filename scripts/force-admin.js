const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: { type: String, select: false },
    role: { type: String, default: 'user' },
    isVerified: { type: Boolean, default: false }
});

// Middleware to hash password - simplified for this script
const bcrypt = require('bcryptjs');
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        console.log('Uri:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected');

        const email = 'admin@golstore.com';
        await User.deleteOne({ email });

        const admin = await User.create({
            name: 'Admin',
            email: email,
            password: 'admin123',
            role: 'admin',
            isVerified: true
        });

        console.log('✅ Admin (re)created');
        console.log(admin);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
