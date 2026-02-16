require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/test?appName=Cluster0';

const platformSchema = new mongoose.Schema({ id: String, nombre: String, activo: Boolean });
const Platform = mongoose.model('Platform', platformSchema);

const genreSchema = new mongoose.Schema({ id: String, nombre: String, activo: Boolean });
const Genre = mongoose.model('Genre', genreSchema);

const productSchema = new mongoose.Schema({ plataformaId: String, platformId: String, generoId: String, genreId: String, activo: Boolean });
const Product = mongoose.model('Product', productSchema);

async function run() {
    await mongoose.connect(MONGO_URI);

    // 1. PLATAFORMAS
    const platformsRaw = await Platform.find({});
    const platforms = [];
    for (const p of platformsRaw) {
        const count = await Product.countDocuments({ $or: [{ plataformaId: p.id }, { platformId: p.id }] });
        platforms.push({ id: p.id, nombre: p.nombre, activo: p.activo, count });
    }

    // 2. GÉNEROS
    const genresRaw = await Genre.find({});
    const genres = [];
    for (const g of genresRaw) {
        const count = await Product.countDocuments({ $or: [{ generoId: g.id }, { genreId: g.id }] });
        genres.push({ id: g.id, nombre: g.nombre, activo: g.activo, count });
    }

    // 3. PRODUCTOS CON IDS RAROS
    const products = await Product.find({}, 'plataformaId generoId nombre');

    const report = { platforms, genres, productsTotal: products.length };
    fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2), 'utf8');
    console.log('Reporte JSON generado.');

    process.exit(0);
}

run().catch(console.error);
