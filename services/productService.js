const Product = require('../models/Product');
const Platform = require('../models/Platform');
const Genre = require('../models/Genre');
const { DEFAULT_IMAGE } = require('../utils/constants');
const ErrorResponse = require('../utils/errorResponse');
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
        requirements: p.requisitos,
        order: p.orden // Expose order index
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
    const { search, platform, genre, minPrice, maxPrice, page = 1, limit = 10, sort, discounted } = query;
    const filter = { activo: true };

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

    if (discounted === 'true') {
        filter.descuentoPorcentaje = { $gt: 0 };
        filter.$or = [
            { descuentoFechaFin: null },
            { descuentoFechaFin: { $gt: new Date() } }
        ];
    }

    // Validación de paginación
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    // Lógica de ordenamiento dinámico
    let sortOptions = { orden: 1 }; // Default: Manual Order (Ascending)

    if (sort) {
        // Soporta formato string "-price" o "price"
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;

        // Mapeo seguro de campos (Evita inyección de sorts raros)
        const allowedSorts = {
            'price': 'precio',
            'createdAt': 'createdAt',
            'rating': 'calificacion',
            'name': 'nombre',
            'order': 'orden'
        };

        if (allowedSorts[sortField]) {
            sortOptions = { [allowedSorts[sortField]]: sortOrder };
        }
    }

    // Ejecución con Populate y Lean para performance (parallelized)
    const [products, count] = await Promise.all([
        Product.find(filter)
            .populate('platformObj')
            .populate('genreObj')
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .sort(sortOptions)
            .lean(),
        Product.countDocuments(filter)
    ]);

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
        throw new ErrorResponse('Producto no encontrado', 404);
    }
    return toResponseDTO(product);
};

exports.createProduct = async (data) => {
    const modelData = mapToModel(data);

    // VALIDACIÓN CRÍTICA: Verificar que Platform y Genre existan y estén activos
    const platform = await Platform.findOne({ id: modelData.plataformaId, activo: true });
    if (!platform) {
        throw new ErrorResponse(`Plataforma '${modelData.plataformaId}' no encontrada o inactiva`, 400);
    }

    const genre = await Genre.findOne({ id: modelData.generoId, activo: true });
    if (!genre) {
        throw new ErrorResponse(`Género '${modelData.generoId}' no encontrado o inactivo`, 400);
    }

    // Auto-rank: Insert at top (smallest order - 1000)
    const firstProduct = await Product.findOne().sort({ orden: 1 });
    const newOrder = firstProduct ? firstProduct.orden - 1000 : 0;
    modelData.orden = newOrder;

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

    if (modelData.plataformaId) {
        const platform = await Platform.findOne({ id: modelData.plataformaId, activo: true });
        if (!platform) {
            throw new ErrorResponse(`Plataforma '${modelData.plataformaId}' no encontrada o inactiva`, 400);
        }
    }

    if (modelData.generoId) {
        const genre = await Genre.findOne({ id: modelData.generoId, activo: true });
        if (!genre) {
            throw new ErrorResponse(`Género '${modelData.generoId}' no encontrado o inactivo`, 400);
        }
    }

    // Usamos findById + save() en vez de findByIdAndUpdate
    // para que el pre-save hook genere los requisitos a partir del specPreset
    const product = await Product.findById(id);
    if (!product) {
        throw new ErrorResponse('Producto no encontrado', 404);
    }

    Object.assign(product, modelData);
    await product.save();

    await product.populate('platformObj');
    await product.populate('genreObj');

    return toResponseDTO(product);
};

exports.deleteProduct = async (id) => {
    const product = await Product.findByIdAndUpdate(id, { activo: false }, { new: true });
    if (!product) {
        throw new ErrorResponse('Producto no encontrado', 404);
    }
    return true;
};

exports.deleteProducts = async (ids) => {
    const result = await Product.updateMany(
        { _id: { $in: ids } },
        { activo: false }
    );
    return result;
};

exports.reorderProduct = async (id, newPosition) => {
    // newPosition es el índice visual (1-based)
    if (newPosition < 1) {
        throw new ErrorResponse('Posición inválida', 400);
    }

    const product = await Product.findById(id);
    if (!product) {
        throw new ErrorResponse('Producto no encontrado', 404);
    }

    if (!product.activo) {
        throw new ErrorResponse('No se puede reordenar un producto inactivo', 400);
    }

    // Obtenemos SOLO productos ACTIVOS (excluyendo el que movemos para simplificar cálculo de huecos)
    const otherProducts = await Product.find({ _id: { $ne: id }, activo: true }).sort({ orden: 1 });

    // Ajustar newPosition a índice de array (0-based) dentro de la lista de "otros"
    // Si quiere ir a la pos 1 (index 0), se inserta antes del elemento 0 de otherProducts.
    // Si quiere ir a pos 2 (index 1), se inserta entre elem 0 y 1.
    // Math.min para no salirnos del rango
    let targetIndex = Math.min(newPosition - 1, otherProducts.length);
    targetIndex = Math.max(0, targetIndex); // Seguridad extra

    // Identificar vecinos
    const prevProduct = targetIndex > 0 ? otherProducts[targetIndex - 1] : null;
    const nextProduct = targetIndex < otherProducts.length ? otherProducts[targetIndex] : null;

    // Calcular valores de orden de los vecinos
    // Si no hay previo, asumimos un valor bajo relativo al siguiente o 0
    // Si no hay siguiente, asumimos un valor alto relativo al previo
    let prevOrder = prevProduct ? prevProduct.orden : (nextProduct ? nextProduct.orden - 2000 : 0);
    let nextOrder = nextProduct ? nextProduct.orden : (prevProduct ? prevProduct.orden + 2000 : 2000);

    // Caso Borde: Inicio de lista vacía o lógica inicial
    if (!prevProduct && !nextProduct) {
        // Solo había 1 producto (el que movemos). Su orden da igual, lo dejamos en 0 o 1000.
        await Product.updateOne({ _id: id }, { orden: 1000 });
        return true;
    }

    // CALCULO SENIOR: Promedio
    let newOrder = (prevOrder + nextOrder) / 2;

    // Verificar colisión o precisión agotada (Gaps muy chicos)
    // Usamos un umbral (epsilon) de 0.005 o simplemente si son iguales
    if (Math.abs(newOrder - prevOrder) < 0.005 || Math.abs(newOrder - nextOrder) < 0.005) {
        // REBALANCEO NECESARIO
        // Insertamos visualmente en el array y reescribimos todo con gaps limpios de 1000
        otherProducts.splice(targetIndex, 0, product);

        const bulkOps = otherProducts.map((p, index) => ({
            updateOne: {
                filter: { _id: p._id },
                update: { $set: { orden: (index + 1) * 1000 } }
            }
        }));

        await Product.bulkWrite(bulkOps);
        return true;
    }

    // UPDATE OPTIMIZADO: Solo tocamos 1 documento
    await Product.updateOne({ _id: id }, { orden: newOrder });
    return true;
};