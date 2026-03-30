const prisma = require('../lib/prisma');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// DTO mapper: Prisma entity → API response
const toDTO = (doc) => ({
    id: doc.id,
    name: doc.nombre,
    imageId: doc.imageId,
    active: doc.activo,
});

// ── Entidades de Referencia (Platform y Genre) ───────────────────────────────

/**
 * Factory que genera un service de metadata (Platform / Genre) usando Prisma.
 * @param {'platform'|'genre'} modelName
 * @param {object} labels
 */
function createMetadataService(modelName, { singular, plural, notFoundMsg, productField }) {
    const model = prisma[modelName];

    return {
        async getAll() {
            const docs = await model.findMany({ where: { activo: true } });
            logger.info(`${plural} obtenidos: ${docs.length}`);
            return docs.map(toDTO);
        },

        async getById(id) {
            // Intentar por slug primero, luego por UUID
            let doc = await model.findFirst({ where: { slug: id } });
            if (!doc) {
                doc = await model.findFirst({ where: { id } });
            }
            if (!doc) throw new ErrorResponse(notFoundMsg || `${singular} no encontrado`, 404);
            return toDTO(doc);
        },

        async create(data) {
            const { id: slug, name, imageId, active } = data;
            if (!slug) throw new ErrorResponse('El ID personalizado (slug) es requerido', 400);

            const existing = await model.findFirst({ where: { slug } });
            if (existing) throw new ErrorResponse(`Ya existe un(a) ${singular} con ese ID`, 400);

            const doc = await model.create({
                data: { slug, nombre: name, imageId, activo: active !== undefined ? active : true }
            });
            logger.info(`${singular} creado: ${doc.slug}`);
            return toDTO(doc);
        },

        async update(id, data) {
            const { name, imageId, active, newId: newSlug } = data;
            const updateData = {};
            if (name !== undefined) updateData.nombre = name;
            if (imageId !== undefined) updateData.imageId = imageId;
            if (active !== undefined) updateData.activo = active;

            let doc = await model.findFirst({ where: { slug: id } });
            if (!doc) throw new ErrorResponse(notFoundMsg || `${singular} no encontrado`, 404);

            if (newSlug && newSlug !== id) {
                const existing = await model.findFirst({ where: { slug: newSlug } });
                if (existing) throw new ErrorResponse(`El ID '${newSlug}' ya está en uso`, 400);
                updateData.slug = newSlug;
            }

            const updated = await model.update({ where: { id: doc.id }, data: updateData });

            // Si cambió el slug, actualizar FK en Product
            if (newSlug && newSlug !== id && productField) {
                const count = await prisma.product.updateMany({
                    where: { [productField]: doc.id },
                    data: { [productField]: updated.id }
                });
                logger.info(`Migrados ${count.count} productos de ${singular} '${id}' a '${newSlug}'`);
            }

            return toDTO(updated);
        },

        async deleteOne(id) {
            let doc = await model.findFirst({ where: { slug: id } });
            if (!doc) doc = await model.findFirst({ where: { id } });
            if (!doc) throw new ErrorResponse(notFoundMsg || `${singular} no encontrado`, 404);

            await model.update({ where: { id: doc.id }, data: { activo: false } });
            logger.info(`${singular} eliminado (soft delete): ${id}`);
            return true;
        },

        async deleteMany(ids) {
            if (!ids || ids.length === 0) throw new ErrorResponse('No se proporcionaron IDs', 400);

            const result = await model.updateMany({
                where: { OR: [{ slug: { in: ids } }, { id: { in: ids } }] },
                data: { activo: false }
            });
            logger.info(`${plural} eliminados (soft delete): ${result.count}`);
            return result;
        }
    };
}

module.exports = createMetadataService;
