require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- USUARIOS REGISTRADOS ---');

        const users = await User.find({}, 'name email role createdAt isVerified').sort({ createdAt: -1 });

        users.forEach(u => {
            console.log(`- ${u.name} (ID: ${u._id.toString().substring(0, 8)}..., Rol: ${u.role}) - ${u.email} - Registrado: ${u.createdAt?.toISOString().split('T')[0] || 'N/A'}`);
        });

        console.log(`\n Total: ${users.length} usuarios.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listUsers();
