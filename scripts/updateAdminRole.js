const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateAdminRole = async () => {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Ì≥¶ Conectado a MongoDB');

        // Buscar el usuario por email
        const user = await User.findOne({ email: 'admin@golstore.com' });
        
        if (!user) {
            console.log('‚ùå Usuario admin@golstore.com no encontrado');
            process.exit(1);
        }

        // Verificar si ya es admin
        if (user.role === 'admin') {
            console.log('‚úÖ El usuario ya tiene rol de admin');
            process.exit(0);
        }

        // Actualizar rol
        user.role = 'admin';
        await user.save();

        console.log('‚úÖ Rol actualizado exitosamente:');
        console.log('   Ì≥ß Email:', user.email);
        console.log('   Ì±§ Nombre:', user.name);
        console.log('   Ìæ≠ Rol anterior: user');
        console.log('   Ìæ≠ Rol nuevo: admin');
        console.log('   Ì∂î ID:', user._id);

        process.exit(0);
    } catch (error) {
        console.error('‚ùå Error:', error.message);
        process.exit(1);
    }
};

updateAdminRole();
