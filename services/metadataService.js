const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Factory that creates a CRUD service for simple metadata entities
 * (Genre, Platform, etc.) that share the same Mongoose schema shape:
 *   { id, nombre, imageId, activo }
 *
 * @param {import('mongoose').Model} Model  - Mongoose model
 * @param {object} labels
 * @param {string} labels.singular          - e.g. 'género'
 * @param {string} labels.plural            - e.g. 'géneros'
 * @param {string} [labels.notFoundMsg]     - e.g. 'Género no encontrado'
 * @param {string} [labels.productField]    - product field to migrate on ID change, e.g. 'generoId'
 */
function createMetadataService(Model, { singular, plural, notFoundMsg, productField }) {
    // Map a Mongoose document to a clean DTO
    const toDTO = (doc) => ({
        id: doc.id,
        name: doc.nombre,
        imageId: doc.imageId,
        active: doc.activo,
    });

    return {
        async getAll() {
            const docs = await Model.find({ activo: true }).lean();
            logger.info(`${plural} obtenidos: ${docs.length}`);
            return docs.map(toDTO);
        },

        async getById(id) {
            let doc = await Model.findOne({ id }).lean();

            if (!doc && MONGO_ID_REGEX.test(id)) {
                doc = await Model.findById(id).lean();
            }

            if (!doc) {
                throw new ErrorResponse(notFoundMsg || `${singular} no encontrado`, 404);
            }

            return toDTO(doc);
        },

        async create(data) {
            const { id, name, imageId, active } = data;

            if (!id) {
                throw new ErrorResponse('El ID personalizado es requerido', 400);
            }

            const existing = await Model.findOne({ id });
            if (existing) {
                throw new ErrorResponse(`Ya existe un(a) ${singular} con ese ID`, 400);
            }

            const doc = await Model.create({
                id,
                nombre: name,
                imageId,
                activo: active !== undefined ? active : true,
            });

            logger.info(`${singular} creado: ${doc.id}`, { nombre: doc.nombre });
            return toDTO(doc);
        },

        async update(id, data) {
            const { name, imageId, active, newId } = data;
            const updateData = {};

            if (name) updateData.nombre = name;
            if (imageId !== undefined) updateData.imageId = imageId;
            if (active !== undefined) updateData.activo = active;

            if (newId && newId !== id) {
                const existing = await Model.findOne({ id: newId });
                if (existing) {
                    throw new ErrorResponse(`El ID '${newId}' ya está en uso por otro(a) ${singular}`, 400);
                }
                updateData.id = newId;
            }

            const doc = await Model.findOneAndUpdate(
                { id },
                {
                    $set: updateData,
                },
                {
                    new: true,
                    upsert: false,
                    runValidators: true,
                }
            );

            if (!doc) {
                throw new ErrorResponse(notFoundMsg || `${singular} no encontrado`, 404);
            }

            if (newId && newId !== id && doc && productField) {
                const result = await Product.updateMany(
                    { [productField]: id },
                    { [productField]: newId }
                );
                logger.info(`Migrados ${result.modifiedCount} productos de ${singular} '${id}' a '${newId}'`);
            }

            return toDTO(doc);
        },

        async deleteOne(id) {
            let doc = await Model.findOneAndUpdate({ id }, { activo: false }, { new: true });

            if (!doc && MONGO_ID_REGEX.test(id)) {
                doc = await Model.findByIdAndUpdate(id, { activo: false }, { new: true });
            }

            if (!doc) {
                throw new ErrorResponse(notFoundMsg || `${singular} no encontrado`, 404);
            }

            logger.info(`${singular} eliminado (soft delete): ${id}`);
            return true;
        },

        async deleteMany(ids) {
            if (!ids || ids.length === 0) {
                throw new ErrorResponse('No se proporcionaron IDs para eliminar', 400);
            }

            const mongoIds = ids.filter((id) => MONGO_ID_REGEX.test(id));

            const result = await Model.updateMany(
                {
                    $or: [
                        { id: { $in: ids } },
                        { _id: { $in: mongoIds } },
                    ],
                },
                { activo: false }
            );

            logger.info(`${plural} eliminados (soft delete): ${result.modifiedCount}`, { ids });
            return result;
        },
    };
}

module.exports = createMetadataService;
