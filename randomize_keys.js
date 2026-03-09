const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Product = require('./models/Product');
const DigitalKey = require('./models/DigitalKey');

async function randomizeStockAndKeys() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const products = await Product.find({ tipo: 'Digital' });
        let totalKeysAdded = 0;

        for (const p of products) {
            // 1. Número aleatorio entre 5 y 30
            const newStock = Math.floor(Math.random() * (30 - 5 + 1)) + 5;

            // 2. Eliminar llaves existentes (para empezar limpio y acorde al stock)
            await DigitalKey.deleteMany({ productoId: p._id });

            // 3. Generar las nuevas llaves
            const keysToInsert = [];
            for (let i = 0; i < newStock; i++) {
                // Generar un número aleatorio como clave (estilo XXXX-XXXX-XXXX)
                const generateSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
                const fakeKey = `${generateSegment()}-${generateSegment()}-${generateSegment()}`;

                keysToInsert.push({
                    productoId: p._id,
                    clave: fakeKey,
                    estado: 'DISPONIBLE'
                });
            }

            // Intentar insertarlas. En caso rarísimo de colisión de clave, se ignora ese error y se sigue.
            // Pero con este nivel de aleatoriedad la colisión es casi imposible.
            await DigitalKey.insertMany(keysToInsert);

            // 4. Actualizar el stock del producto
            p.stock = newStock;
            await p.save();

            console.log(`[${p.nombre}] -> Stock ajustado a ${newStock} y se generaron ${newStock} keys.`);
            totalKeysAdded += newStock;
        }

        console.log(`\n¡Listo! Se actualizaron ${products.length} productos digitales y se crearon ${totalKeysAdded} keys.`);

    } catch (error) {
        console.error("Error BD:", error);
    } finally {
        mongoose.disconnect();
    }
}

randomizeStockAndKeys();
