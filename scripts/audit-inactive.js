require('dotenv').config();
const mongoose = require('mongoose');

// Definir schema mínimo para evitar errores de modelo completo
const productSchema = new mongoose.Schema({
    nombre: String,
    activo: Boolean,
    orden: Number
}, { strict: false });

const Product = mongoose.model('Product', productSchema);

// URI de conexión (usando la del entorno o fallback para script)
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://emartinez03:kukimZ10@cluster0.5ohgu.mongodb.net/test?appName=Cluster0';

async function auditInactive() {
    try {
        console.log("Conectando a DB...");
        await mongoose.connect(MONGO_URI);

        const inactivos = await Product.find({ activo: false }).sort({ orden: 1 });

        console.log(`\n--- REPORTE: PRODUCTOS ELIMINADOS/INACTIVOS (${inactivos.length}) ---`);
        if (inactivos.length === 0) {
            console.log("No hay productos inactivos. La base de datos está limpia.");
        } else {
            console.log("Estos productos están ocultos pero OCUPAN LUGAR en el ordenamiento:\n");
            inactivos.forEach(p => {
                console.log(`[INACTIVO] Orden: ${p.orden} - ${p.nombre} (ID: ${p._id})`);
            });
            const fs = require('fs');
            fs.writeFileSync('inactivos_reporte.json', JSON.stringify(inactivos, null, 2));
            console.log("Reporte guardado en inactivos_reporte.json");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

auditInactive();
