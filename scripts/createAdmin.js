const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Ì≥¶ Conectado a MongoDB');

        // Verificar si el admin ya existe
        const adminExists = await User.findOne({ email: 'admin@golstore.com' });
        
        if (adminExists) {
            console.log('‚ö†Ô∏è  El usuario admin@golstore.com ya existe');
            
            // Actualizar a rol admin si no lo es
            if (adminExists.role !== 'admin') {
                adminExists.role = 'admin';
                await adminExists.save();
                console.log('‚úÖ Rol actualizado de "user" a "admin"');
            } else {
                console.log('‚úÖ El usuario ya tiene rol de admin');
            }
            
            console.log('   Ì≥ß Email:', adminExists.email);
            console.log('   Ì±§ Nombre:', adminExists.name);
            console.log('   Ìæ≠ Rol:', adminExists.role);
            console.log('   Ì∂î ID:', adminExists._id);
            
            process.exit(0);
        }

        // Hash de la contrase√±a
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // Crear usuario admin
        const admin = await User.create({
            name: 'Admin',
            email: 'admin@golstore.com',
            password: hashedPassword,
            role: 'admin'
        });

        console.log('‚úÖ Usuario administrador creado exitosamente:');
        console.log('   Ì≥ß Email: admin@golstore.com');
        console.log('   Ì¥ë Password: password123');
        console.log('   Ì±§ Nombre:', admin.name);
        console.log('   Ìæ≠ Rol: admin');
        console.log('   Ì∂î ID:', admin._id);

        process.exit(0);
    } catch (error) {
        console.error('‚ùå Error:', error.message);
        process.exit(1);
    }
};

createAdmin();
