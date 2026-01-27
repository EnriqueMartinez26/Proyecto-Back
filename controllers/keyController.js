const DigitalKey = require('../models/DigitalKey');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// Agregar keys masivamente
exports.addKeys = async (req, res, next) => {
    try {
        const { productId, keys } = req.body;

        if (!productId) throw new ErrorResponse('ProductId requerido', 400);
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
            throw new ErrorResponse('Se requiere un array de keys no vacío', 400);
        }

        const product = await Product.findById(productId);
        if (!product) throw new ErrorResponse('Producto no encontrado', 404);
        if (product.tipo !== 'Digital') throw new ErrorResponse('El producto no es digital', 400);

        // 1. Filtrar duplicados en la entrada
        const uniqueKeys = [...new Set(keys)];

        // 2. Filtrar duplicados en DB (Keys que ya existen)
        const existingKeysDocs = await DigitalKey.find({ clave: { $in: uniqueKeys } }).select('clave');
        const existingKeysSet = new Set(existingKeysDocs.map(k => k.clave));

        const newKeysToInsert = uniqueKeys
            .filter(k => !existingKeysSet.has(k))
            .map(k => ({
                productoId: productId,
                clave: k,
                estado: 'DISPONIBLE'
            }));

        if (newKeysToInsert.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No se agregaron keys nuevas (todas ya existían)',
                addedCount: 0
            });
        }

        // 3. Insertar
        await DigitalKey.insertMany(newKeysToInsert);

        // 4. Actualizar Stock "Caché" en Producto (Opcional pero recomendado para speed)
        // Recalculamos el total real
        const currentTotal = await DigitalKey.countDocuments({ productoId: productId, estado: 'DISPONIBLE' });
        product.stock = currentTotal;
        await product.save();

        logger.info(`🔑 ${newKeysToInsert.length} keys agregadas para ${product.nombre}`);

        res.status(201).json({
            success: true,
            message: `Se agregaron ${newKeysToInsert.length} keys exitosamente`,
            addedCount: newKeysToInsert.length,
            ignoredCount: uniqueKeys.length - newKeysToInsert.length,
            currentStock: currentTotal
        });

    } catch (error) {
        next(error);
    }
};

// Revocar Key (Marcar como defectuosa/revocada) -> No borrar para historial
// O Borrar si fue error de carga
exports.deleteKey = async (req, res, next) => {
    try {
        const { id } = req.params;
        const key = await DigitalKey.findById(id);

        if (!key) throw new ErrorResponse('Key no encontrada', 404);

        if (key.estado === 'VENDIDA') {
            // Si ya se vendió, cuidado. Por ahora permitimos borrar pero logueamos fuerte.
            logger.warn(`🗑️ Admin borrando key VENDIDA: ${key.clave} (Orden: ${key.pedidoId})`);
        }

        const productId = key.productoId;
        await DigitalKey.findByIdAndDelete(id);

        // Actualizar stock producto
        const product = await Product.findById(productId);
        if (product) {
            const count = await DigitalKey.countDocuments({ productoId: productId, estado: 'DISPONIBLE' });
            product.stock = count;
            await product.save();
        }

        res.json({ success: true, message: 'Key eliminada' });
    } catch (error) {
        next(error);
    }
};

exports.getKeysByProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const keys = await DigitalKey.find({ productoId: productId })
            .sort({ createdAt: -1 })
            .limit(100); // Limit para no explotar

        res.json({ success: true, count: keys.length, data: keys });
    } catch (error) {
        next(error);
    }
};
