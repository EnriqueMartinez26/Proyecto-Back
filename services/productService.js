const Product = require('../models/Product');
const Platform = require('../models/Platform');
const Genre = require('../models/Genre');
const { DEFAULT_IMAGE, UNKNOWN_PRODUCT } = require('../utils/constants');

// --- PRIVATE MAPPER (DTO TRANSFORMER) ---
// Transforma el documento Mongoose (Español) a DTO API (Inglés)
const toResponseDTO = (productDoc) => {
    if (!productDoc) return null;

    const p = productDoc.toObject ? productDoc.toObject() : productDoc;

    return {
        id: p._id,
        name: p.nombre,
        description: p.descripcion,
        price: p.precio,
        // Unification: Use populated virtuals (platformObj/genreObj)
        platform: p.platformObj ? {
            id: p.platformObj.id,
            name: p.platformObj.nombre,
            imageId: p.platformObj.imageId,
            active: p.platformObj.activo
        } : { id: p.plataformaId, name: 'Unknown' },

        genre: p.genreObj ? {
            id: p.genreObj.id,
            name: p.genreObj.nombre,
            imageId: p.genreObj.imageId,
            active: p.genreObj.activo
        } : { id: p.generoId, name: 'Unknown' },

        type: p.tipo === 'Fisico' ? 'Physical' : 'Digital', // Mapeo de Enum
        releaseDate: p.fechaLanzamiento,
        developer: p.desarrollador,
        imageId: p.imagenUrl || DEFAULT_IMAGE,
        trailerUrl: p.trailerUrl || '',
        rating: p.calificacion,
        stock: p.stock,
        active: p.activo
    };
};

// Exportar el mapper para uso en otros controladores (Cart, Wishlist, Order)
exports.transformDTO = toResponseDTO;

// --- PRIVATE MAPPER (DTO TO MODEL) ---
const mapToModel = (data) => {
    const modelData = { ...data }; // Copy original data

    // Map English keys to Mongoose Schema keys
    if (data.name !== undefined) modelData.nombre = data.name;
    if (data.description !== undefined) modelData.descripcion = data.description;
    if (data.price !== undefined) modelData.precio = data.price;
    if (data.platform !== undefined) modelData.plataformaId = data.platform;
    if (data.genre !== undefined) modelData.generoId = data.genre;
    if (data.type !== undefined) {
        // Map English Enum to Spanish Enum if necessary
        modelData.tipo = data.type === 'Physical' ? 'Fisico' : data.type;
    }
    if (data.releaseDate !== undefined) modelData.fechaLanzamiento = data.releaseDate;
    if (data.developer !== undefined) modelData.desarrollador = data.developer;
    if (data.imageId !== undefined) modelData.imagenUrl = data.imageId;
    if (data.trailerUrl !== undefined) modelData.trailerUrl = data.trailerUrl;
    if (data.rating !== undefined) modelData.calificacion = data.rating;
    if (data.stock !== undefined) modelData.stock = data.stock;
    if (data.active !== undefined) modelData.activo = data.active;

    return modelData;
};

// --- SERVICIO PÚBLICO ---

exports.getProducts = async (query = {}) => {
    const { search, platform, genre, minPrice, maxPrice, page = 1, limit = 10 } = query;
    const filter = { activo: true }; // Por defecto solo activos

    if (search) {
        filter.$text = { $search: search };
    }
    // Nota: Si platform/genre vienen como nombres, habría que buscar sus IDs primero.
    // Asumimos que vienen como IDs por ahora.
    if (platform) filter.plataformaId = platform;
    if (genre) filter.generoId = genre;

    if (minPrice || maxPrice) {
        filter.precio = {};
        if (minPrice) filter.precio.$gte = Number(minPrice);
        if (maxPrice) filter.precio.$lte = Number(maxPrice);
    }

    // Validación de paginación
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    // Ejecución con Populate y Lean para performance
    const products = await Product.find(filter)
        .populate('platformObj')
        .populate('genreObj')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean();

    const count = await Product.countDocuments(filter);

    return {
        data: products.map(toResponseDTO),
        meta: {
            total: count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(count / limitNum)
        }
    };
};

exports.getProductById = async (id) => {
    const product = await Product.findById(id)
        .populate('platformObj')
        .populate('genreObj')
        .lean();

    if (!product) {
        const error = new Error('Producto no encontrado');
        error.statusCode = 404;
        throw error;
    }
    return toResponseDTO(product);
};

exports.createProduct = async (data) => {
    const modelData = mapToModel(data);
    const product = await Product.create(modelData);

    // Recargar para poblar y devolver DTO completo
    const populatedProduct = await Product.findById(product._id)
        .populate('platformObj')
        .populate('genreObj');

    return toResponseDTO(populatedProduct);
};

exports.updateProduct = async (id, data) => {
    const modelData = mapToModel(data);
    const product = await Product.findByIdAndUpdate(id, modelData, { new: true, runValidators: true })
        .populate('platformObj')
        .populate('genreObj');

    if (!product) throw new Error('ProductNotFound');
    return toResponseDTO(product);
};

exports.deleteProduct = async (id) => {
    const product = await Product.findByIdAndUpdate(id, { activo: false }, { new: true });
    if (!product) throw new Error('ProductNotFound');
    return true;
};

exports.deleteProducts = async (ids) => {
    const result = await Product.updateMany(
        { _id: { $in: ids } },
        { activo: false }
    );
    return result;
};