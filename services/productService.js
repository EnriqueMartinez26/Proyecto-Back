const Product = require('../models/Product');
const Platform = require('../models/Platform');
const Genre = require('../models/Genre');
const { DEFAULT_IMAGE, UNKNOWN_PRODUCT } = require('../utils/constants');
const logger = require('../utils/logger');

// --- PRIVATE MAPPER (DTO TRANSFORMER) ---
// Transforma el documento Mongoose (Español) a DTO API (Inglés)
const toResponseDTO = (productDoc) => {
    if (!productDoc) return null;

    const p = productDoc.toObject ? productDoc.toObject() : productDoc;

    // Discount: calcular finalPrice dinámicamente
    const discountActive = p.descuentoPorcentaje > 0 &&
        (!p.descuentoFechaFin || new Date(p.descuentoFechaFin) > new Date());

    const discountPercentage = discountActive ? p.descuentoPorcentaje : 0;
    const finalPrice = discountActive
        ? Number((p.precio * (1 - p.descuentoPorcentaje / 100)).toFixed(2))
        : p.precio;

    return {
        id: p._id,
        name: p.nombre,
        description: p.descripcion,
        price: p.precio,
        finalPrice,
        discountPercentage,
        discountEndDate: p.descuentoFechaFin,
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
        type: p.tipo === 'Fisico' ? 'Physical' : 'Digital',
        releaseDate: p.fechaLanzamiento,
        developer: p.desarrollador,
        imageId: p.imagenUrl || DEFAULT_IMAGE,
        trailerUrl: p.trailerUrl || '',
        rating: p.calificacion,
        stock: p.stock,
        active: p.activo,
        specPreset: p.specPreset,
        requirements: p.requisitos
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
    if (data.specPreset !== undefined) modelData.specPreset = data.specPreset;
    if (data.requirements !== undefined) modelData.requisitos = data.requirements;
    // Discount Fields Mapping
    if (data.discountPercentage !== undefined) modelData.descuentoPorcentaje = data.discountPercentage;
    if (data.discountEndDate !== undefined) modelData.descuentoFechaFin = data.discountEndDate || null;

    return modelData;
};

// --- SERVICIO PÚBLICO ---

exports.getProducts = async (query = {}) => {
    const { search, platform, genre, minPrice, maxPrice, page = 1, limit = 10, sort } = query;
    const filter = { activo: true }; // Por defecto solo activos

    if (search) {
        filter.$text = { $search: search };
    }

    // Support comma-separated IDs for Multi-Select
    if (platform) {
        const platforms = platform.split(',').filter(Boolean);
        if (platforms.length > 0) filter.plataformaId = { $in: platforms };
    }
    if (genre) {
        const genres = genre.split(',').filter(Boolean);
        if (genres.length > 0) filter.generoId = { $in: genres };
    }

    if (minPrice || maxPrice) {
        filter.precio = {};
        if (minPrice) filter.precio.$gte = Number(minPrice);
        if (maxPrice) filter.precio.$lte = Number(maxPrice);
    }

    // Validación de paginación
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    // Lógica de ordenamiento dinámico
    let sortOptions = { createdAt: -1 }; // Default: Newest first

    if (sort) {
        // Soporta formato string "-price" o "price"
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;

        // Mapeo seguro de campos (Evita inyección de sorts raros)
        const allowedSorts = {
            'price': 'precio',
            'createdAt': 'createdAt',
            'rating': 'calificacion',
            'name': 'nombre'
        };

        if (allowedSorts[sortField]) {
            sortOptions = { [allowedSorts[sortField]]: sortOrder };
        }
    }

    // Ejecución con Populate y Lean para performance
    const products = await Product.find(filter)
        .populate('platformObj')
        .populate('genreObj')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort(sortOptions)
        .lean();

    const count = await Product.countDocuments(filter);

    logger.info(`Productos obtenidos: ${products.length} de ${count} totales`, {
        filter,
        page: pageNum,
        limit: limitNum
    });

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

    // VALIDACIÓN CRÍTICA: Verificar que Platform y Genre existan y estén activos
    const platform = await Platform.findOne({ id: modelData.plataformaId, activo: true });
    if (!platform) {
        const error = new Error(`Plataforma '${modelData.plataformaId}' no encontrada o inactiva`);
        error.statusCode = 400;
        throw error;
    }

    const genre = await Genre.findOne({ id: modelData.generoId, activo: true });
    if (!genre) {
        const error = new Error(`Género '${modelData.generoId}' no encontrado o inactivo`);
        error.statusCode = 400;
        throw error;
    }

    const product = await Product.create(modelData);

    logger.info(`Producto creado exitosamente: ${product._id}`, {
        nombre: modelData.nombre,
        plataformaId: modelData.plataformaId,
        generoId: modelData.generoId
    });

    // Recargar para poblar y devolver DTO completo
    const populatedProduct = await Product.findById(product._id)
        .populate('platformObj')
        .populate('genreObj');

    return toResponseDTO(populatedProduct);
};

exports.updateProduct = async (id, data) => {
    const modelData = mapToModel(data);

    // VALIDACIÓN: Si se está actualizando plataforma o género, verificar que existan
    if (modelData.plataformaId) {
        const platform = await Platform.findOne({ id: modelData.plataformaId, activo: true });
        if (!platform) {
            const error = new Error(`Plataforma '${modelData.plataformaId}' no encontrada o inactiva`);
            error.statusCode = 400;
            throw error;
        }
    }

    if (modelData.generoId) {
        const genre = await Genre.findOne({ id: modelData.generoId, activo: true });
        if (!genre) {
            const error = new Error(`Género '${modelData.generoId}' no encontrado o inactivo`);
            error.statusCode = 400;
            throw error;
        }
    }

    const product = await Product.findByIdAndUpdate(id, modelData, { new: true, runValidators: true })
        .populate('platformObj')
        .populate('genreObj');

    if (!product) {
        const error = new Error('Producto no encontrado');
        error.statusCode = 404;
        throw error;
    }
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