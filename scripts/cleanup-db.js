require('dotenv').config();
const mongoose = require('mongoose');

// URI extraída del .env hardcodeada por seguridad de testing
const MONGO_URI = 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/test?appName=Cluster0';

const platformSchema = new mongoose.Schema({ id: String, nombre: String, activo: Boolean });
const Platform = mongoose.model('Platform', platformSchema);

const productSchema = new mongoose.Schema({ plataformaId: String, platformId: String, generoId: String, genreId: String, activo: Boolean });
const Product = mongoose.model('Product', productSchema);

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('--- LIMPIEZA DE BASE DE DATOS ---\n');

    // 1. Eliminar plataformas obsoletas (inactivas y vacías)
    const obsoleteIds = ['xbox', 'pc', 'ps5', 'switch']; // IDs que detectamos vacíos e inactivos en el reporte

    for (const id of obsoleteIds) {
        const platform = await Platform.findOne({ id });
        if (platform) {
            // Check doble para asegurar seguridad
            const count = await Product.countDocuments({ $or: [{ plataformaId: id }, { platformId: id }] });
            if (count === 0) {
                await Platform.deleteOne({ _id: platform._id });
                console.log(`✅ Eliminada plataforma obsoleta: ${id}`);
            } else {
                console.log(`⚠️ No se eliminó ${id} porque tiene ${count} productos.`);
            }
        }
    }

    // 2. Corregir humble-bundle -> xbox
    // El usuario quería renombrar a xbox pero chocaba. Ahora que borramos xbox, podemos hacerlo.
    const humble = await Platform.findOne({ id: 'humble-bundle' });
    if (humble) {
        console.log('Detectada plataforma humble-bundle. Migrando a xbox...');

        humble.id = 'xbox';
        humble.nombre = 'Xbox';
        humble.activo = true; // Reactivamos para que aparezca
        await humble.save();
        console.log('✅ humble-bundle renombrada a xbox y activada.');

        // Migrar productos
        const res = await Product.updateMany(
            { $or: [{ plataformaId: 'humble-bundle' }, { platformId: 'humble-bundle' }] },
            { $set: { plataformaId: 'xbox' } } // Unificamos a plataformaId
        );
        console.log(`✅ ${res.modifiedCount} productos migrados de humble-bundle a xbox.`);
    }

    console.log('\nLimpieza finalizada.');
    process.exit(0);
}

run().catch(console.error);
