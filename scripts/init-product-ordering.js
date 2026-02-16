require('dotenv').config();
const mongoose = require('mongoose');

// URI de produccion/test segun conveniencia. Usare la URI del .env si existe o la hardcodeada de test.
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/test?appName=Cluster0';

const productSchema = new mongoose.Schema({
    orden: { type: Number, default: 0 }
}, { strict: false }); // Strict false para no borrar otros campos al leer parcial

const Product = mongoose.model('Product', productSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('--- INICIALIZANDO ORDEN DE PRODUCTOS ---\n');

        // Obtener todos los productos ordenados por fecha de creación (los mas viejos primero, orden 0)
        const products = await Product.find({}).sort({ createdAt: 1 });

        console.log(`Encontrados ${products.length} productos.`);

        let i = 0;
        for (const p of products) {
            // Asignamos orden secuencial. 
            // Multiplicamos por 1000 para dejar espacio entre items si quisieramos reordenar "en medio" sin mover todo el resto (técnica de gaps)
            // Aunque para este MVP con swap directo, 1, 2, 3... sirve.
            // Pero gaps son mejores para dnd futuro. Usaremos 1000 de gap.
            const newOrder = i * 1000;

            await Product.updateOne({ _id: p._id }, { $set: { orden: newOrder } });
            i++;
        }

        console.log('✅ Orden inicializado correctamente con gaps de 1000.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

run();
