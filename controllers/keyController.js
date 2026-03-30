const prisma = require('../lib/prisma');
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

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new ErrorResponse('Producto no encontrado', 404);
        if (product.type !== 'Digital') throw new ErrorResponse('El producto no es digital', 400);

        // 1. Filtrar duplicados en la entrada
        const uniqueKeys = [...new Set(keys)];

        // 2. Filtrar duplicados en DB (Keys que ya existen)
        const existingKeysDocs = await prisma.digitalKey.findMany({
            where: { clave: { in: uniqueKeys } },
            select: { clave: true }
        });
        const existingKeysSet = new Set(existingKeysDocs.map(k => k.clave));

        const newKeysToInsert = uniqueKeys
            .filter(k => !existingKeysSet.has(k))
            .map(k => ({
                productId: productId,
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
        await prisma.digitalKey.createMany({
            data: newKeysToInsert,
            skipDuplicates: true
        });

        // 4. Actualizar Stock "Caché" en Producto (Opcional pero recomendado para speed)
        // Recalculamos el total real
        const currentTotal = await prisma.digitalKey.count({
            where: { productId: productId, estado: 'DISPONIBLE' }
        });
        
        await prisma.product.update({
            where: { id: productId },
            data: { stock: currentTotal }
        });

        logger.info(`🔑 ${newKeysToInsert.length} keys agregadas para ${product.name}`);

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
        const key = await prisma.digitalKey.findUnique({ where: { id } });

        if (!key) throw new ErrorResponse('Key no encontrada', 404);

        if (key.estado === 'VENDIDA') {
            // Si ya se vendió, cuidado. Por ahora permitimos borrar pero logueamos fuerte.
            logger.warn(`🗑️ Admin borrando key VENDIDA: ${key.clave} (Orden: ${key.orderId})`);
        }

        const productId = key.productId;
        await prisma.digitalKey.delete({ where: { id } });

        // Actualizar stock producto
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (product) {
            const count = await prisma.digitalKey.count({
                where: { productId: productId, estado: 'DISPONIBLE' }
            });
            await prisma.product.update({
                where: { id: productId },
                data: { stock: count }
            });
        }

        res.json({ success: true, message: 'Key eliminada' });
    } catch (error) {
        next(error);
    }
};

exports.getKeysByProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const keys = await prisma.digitalKey.findMany({
            where: { productId: productId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({ success: true, count: keys.length, data: keys });
    } catch (error) {
        next(error);
    }
};
