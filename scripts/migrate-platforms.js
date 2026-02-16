/**
 * Migra las plataformas de consolas a tiendas digitales reales.
 * Crea Steam, Epic Games, GOG y Humble Bundle, y redistribuye los productos.
 * Uso: node scripts/migrate-platforms.js
 */
const mongoose = require('mongoose');
require('../models/Platform');
require('../models/Product');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/?appName=Cluster0';

const NEW_PLATFORMS = [
    { id: 'steam', nombre: 'Steam' },
    { id: 'epic-games', nombre: 'Epic Games' },
    { id: 'gog', nombre: 'GOG' },
    { id: 'humble-bundle', nombre: 'Humble Bundle' },
];

// Distribución de productos por nombre -> plataforma
// Los que no estén acá se asignan a Steam por defecto
const PRODUCT_PLATFORM_MAP = {
    'Fortnite': 'epic-games',
    'Forza Horizon 5': 'humble-bundle',
    'Manor Lords': 'gog',
    'Palworld': 'humble-bundle',
    'EA Sports FC 25': 'epic-games',
    'Call of Duty: Black Ops 6': 'epic-games',
    'The Witcher 3: Wild Hunt - GOTY': 'gog',
    'Cyberpunk 2077': 'gog',
    'Hogwarts Legacy': 'epic-games',
    'It Takes Two': 'epic-games',
    "Baldur's Gate 3": 'gog',
    'Minecraft: Java & Bedrock Edition': 'humble-bundle',
    'Sid Meier\'s Civilization VII': 'humble-bundle',
};

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const Platform = mongoose.model('Platform');
    const Product = mongoose.model('Product');

    // 1. Crear/actualizar las nuevas plataformas
    console.log('\n🏪 Creando plataformas digitales...');
    for (const p of NEW_PLATFORMS) {
        const result = await Platform.findOneAndUpdate(
            { id: p.id },
            { id: p.id, nombre: p.nombre, activo: true },
            { upsert: true, new: true }
        );
        console.log(`  ✓ ${result.id} -> ${result.nombre}`);
    }

    // 2. Desactivar plataformas que no son las nuevas
    const newIds = NEW_PLATFORMS.map(p => p.id);
    const deactivated = await Platform.updateMany(
        { id: { $nin: newIds } },
        { activo: false }
    );
    if (deactivated.modifiedCount > 0) {
        console.log(`  ⚠ ${deactivated.modifiedCount} plataformas antiguas desactivadas`);
    }

    // 3. Migrar productos a las nuevas plataformas
    console.log('\n🎮 Migrando productos...');
    const products = await Product.find({});
    let migrated = 0;

    for (const product of products) {
        const newPlatformId = PRODUCT_PLATFORM_MAP[product.nombre] || 'steam';

        if (product.plataformaId !== newPlatformId) {
            product.plataformaId = newPlatformId;
            await product.save();
            console.log(`  ✓ ${product.nombre} -> ${newPlatformId}`);
            migrated++;
        } else {
            console.log(`  ⏭ ${product.nombre} (ya en ${newPlatformId})`);
        }
    }

    console.log(`\n📊 Resumen: ${migrated} productos migrados`);
    console.log('✅ Migración completada');
    process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e); process.exit(1); });
