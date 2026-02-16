require('dotenv').config();
const mongoose = require('mongoose');

// URI extraída del .env del usuario
const MONGO_URI = 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/test?appName=Cluster0';

const platformSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    activo: Boolean
});
const Platform = mongoose.model('Platform', platformSchema);

const genreSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    activo: Boolean
});
const Genre = mongoose.model('Genre', genreSchema);

// Schema product con ambos nombres de campo por si acaso (el viejo y el nuevo)
const productSchema = new mongoose.Schema({
    plataformaId: String,
    platformId: String,
    generoId: String,
    genreId: String,
    activo: Boolean
});
const Product = mongoose.model('Product', productSchema);

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('--- AUDITORÍA DE DATABASE (test) ---\n');

    // 1. PLATAFORMAS
    console.log('>>> PLATAFORMAS');
    const platforms = await Platform.find({});
    console.log(`Total plataformas: ${platforms.length}`);
    console.log('ID'.padEnd(30) + 'Nombre'.padEnd(30) + 'Activo'.padEnd(10) + 'Productos');
    console.log('-'.repeat(90));

    for (const p of platforms) {
        // Buscar productos asociados por plataformaId O platformId
        const count = await Product.countDocuments({
            $or: [{ plataformaId: p.id }, { platformId: p.id }]
        });

        console.log(`${p.id.padEnd(30)} ${p.nombre.padEnd(30)} ${String(p.activo).padEnd(10)} ${count}`);
    }
    console.log('\n');

    // 2. GÉNEROS
    console.log('>>> GÉNEROS');
    const genres = await Genre.find({});
    console.log(`Total géneros: ${genres.length}`);
    console.log('ID'.padEnd(30) + 'Nombre'.padEnd(30) + 'Activo'.padEnd(10) + 'Productos');
    console.log('-'.repeat(90));

    for (const g of genres) {
        const count = await Product.countDocuments({
            $or: [{ generoId: g.id }, { genreId: g.id }]
        });
        console.log(`${g.id.padEnd(30)} ${g.nombre.padEnd(30)} ${String(g.activo).padEnd(10)} ${count}`);
    }

    process.exit(0);
}

run().catch(console.error);
