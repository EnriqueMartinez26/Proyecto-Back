require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/test?appName=Cluster0';

const productSchema = new mongoose.Schema({
    nombre: String,
    activo: Boolean,
    orden: Number
}, { strict: false });

const Product = mongoose.model('Product', productSchema);

async function fixOrdering() {
    try {
        console.log("Conectando a DB...");
        await mongoose.connect(MONGO_URI);

        console.log("--- INICIANDO LIMPIEZA Y REORDENAMIENTO INTELIGENTE ---");

        // 1. Mover INACTIVOS al fondo
        const inactivos = await Product.find({ activo: false });
        console.log(`Encontrados ${inactivos.length} productos inactivos. Moviéndolos al fondo...`);

        // Usamos bulkWrite para eficiencia
        if (inactivos.length > 0) {
            const bulkInactivos = inactivos.map((p, index) => ({
                updateOne: {
                    filter: { _id: p._id },
                    update: { $set: { orden: 9000000 + (index * 1000) } }
                }
            }));
            await Product.bulkWrite(bulkInactivos);
        }

        // 2. Reordenar ACTIVOS secuencialmente
        // Esto elimina los huecos dejados por los inactivos y asegura que el orden 1, 2, 3 sea real
        const activos = await Product.find({ activo: true }).sort({ orden: 1 });
        console.log(`Encontrados ${activos.length} productos activos. Reorganizando secuencia...`);

        if (activos.length > 0) {
            const bulkActivos = activos.map((p, index) => ({
                updateOne: {
                    filter: { _id: p._id },
                    update: { $set: { orden: index * 1000 } } // 0, 1000, 2000, 3000...
                }
            }));
            await Product.bulkWrite(bulkActivos);
        }

        console.log("✅ BASE DE DATOS NORMALIZADA.");
        console.log("Ahora el orden visual coincide exactamente con el orden lógico.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

fixOrdering();
