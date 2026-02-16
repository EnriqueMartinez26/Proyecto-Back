/**
 * Fix: Renombra el platformId 'humble-bundle' de la plataforma XBox a 'xbox'
 * Uso: node scripts/fix-xbox-platform.js
 */
const mongoose = require('mongoose');
require('../models/Platform');
require('../models/Product');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/?appName=Cluster0';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const Platform = mongoose.model('Platform');
    const Product = mongoose.model('Product');

    // 1. Buscar la plataforma con nombre XBox/Xbox que tiene id 'humble-bundle'
    const wrongPlatform = await Platform.findOne({ id: 'humble-bundle' });
    if (!wrongPlatform) {
        console.log('⚠ No se encontró plataforma con id "humble-bundle"');
    } else {
        console.log(`  Encontrada: ${wrongPlatform.nombre} (id: ${wrongPlatform.id})`);

        // Verificar si ya existe una con id 'xbox'
        const existingXbox = await Platform.findOne({ id: 'xbox' });
        if (existingXbox) {
            console.log('  Ya existe una plataforma con id "xbox", eliminando la duplicada...');
            await Platform.deleteOne({ _id: wrongPlatform._id });

            // Migrar productos de humble-bundle a xbox
            const migrated = await Product.updateMany(
                { plataformaId: 'humble-bundle' },
                { plataformaId: 'xbox' }
            );
            console.log(`  ✓ ${migrated.modifiedCount} productos migrados de humble-bundle -> xbox`);
        } else {
            // Renombrar el id
            wrongPlatform.id = 'xbox';
            await wrongPlatform.save();
            console.log('  ✓ ID cambiado de "humble-bundle" a "xbox"');

            // Migrar productos
            const migrated = await Product.updateMany(
                { plataformaId: 'humble-bundle' },
                { plataformaId: 'xbox' }
            );
            console.log(`  ✓ ${migrated.modifiedCount} productos migrados de humble-bundle -> xbox`);
        }
    }

    // 2. Crear 'humble-bundle' como plataforma nueva si la queremos mantener
    const humbleExists = await Platform.findOne({ id: 'humble-bundle' });
    if (!humbleExists) {
        await Platform.create({ id: 'humble-bundle', nombre: 'Humble Bundle', activo: true });
        console.log('  ✓ Plataforma "Humble Bundle" re-creada');
    }

    console.log('\n✅ Fix completado');
    process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e); process.exit(1); });
