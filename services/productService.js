const Product = require('../models/Product');
const Platform = require('../models/Platform'); // Asegúrate de tener estos modelos importados
const Genre = require('../models/Genre');

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
        // Manejo defensivo: si no se pudo poblar, devuelve null o estructura básica
        platform: p.plataformaId && p.plataformaId.nombre ? { 
            id: p.plataformaId._id, 
            name: p.plataformaId.nombre 
        } : { id: p.plataformaId, name: 'Unknown' },
        
        genre: p.generoId && p.generoId.nombre ? { 
            id: p.generoId._id, 
            name: p.generoId.nombre 
        } : { id: p.generoId, name: 'Unknown' },

        type: p.tipo === 'Fisico' ? 'Physical' : 'Digital', // Mapeo de Enum
        releaseDate: p.fechaLanzamiento,
        developer: p.desarrollador,
        imageId: p.imagenUrl,
        rating: p.calificacion,
        stock: p.stock,
        active: p.activo
    };
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

    // Ejecución con Populate para obtener objetos completos
    const products = await Product.find(filter)
        .populate('plataformaId', 'nombre') // Traer solo nombre e ID
        .populate('generoId', 'nombre')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    const count = await Product.countDocuments(filter);

    return {
        data: products.map(toResponseDTO), // Aplicar Mapper
        pagination: {
            total: count,
            page: Number(page),
            pages: Math.ceil(count / limit)
        }
    };
};

exports.getProductById = async (id) => {
    const product = await Product.findById(id)
        .populate('plataformaId', 'nombre')
        .populate('generoId', 'nombre');
        
    if (!product) throw new Error('ProductNotFound');
    return toResponseDTO(product);
};

exports.createProduct = async (data) => {
    // Aquí podrías agregar validación de negocio extra
    const product = await Product.create(data);
    // Recargar para poblar y devolver DTO completo
    const populatedProduct = await Product.findById(product._id)
        .populate('plataformaId', 'nombre')
        .populate('generoId', 'nombre');
        
    return toResponseDTO(populatedProduct);
};

exports.updateProduct = async (id, data) => {
    const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate('plataformaId', 'nombre')
        .populate('generoId', 'nombre');

    if (!product) throw new Error('ProductNotFound');
    return toResponseDTO(product);
};

exports.deleteProduct = async (id) => {
    const product = await Product.findByIdAndUpdate(id, { activo: false }, { new: true });
    if (!product) throw new Error('ProductNotFound');
    return true;
};