const Product = require('../models/Product');

class ProductService {
  /**
   * Obtiene productos con filtrado, paginación y ordenamiento.
   * @param {Object} params - Parámetros de consulta depurados.
   */
  async getProducts({ search, platform, genre, minPrice, maxPrice, page = 1, limit = 10 }) {
    // 1. Construcción de Query Dinámica
    const query = { activo: true };

    if (search) {
      // Búsqueda por texto (nombre o descripción)
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } }
      ];
    }

    if (platform && platform !== 'all') query.plataformaId = platform;
    if (genre && genre !== 'all') query.generoId = genre;

    // Filtrado de rango de precios
    if (minPrice || maxPrice) {
      query.precio = {};
      if (minPrice) query.precio.$gte = Number(minPrice);
      if (maxPrice) query.precio.$lte = Number(maxPrice);
    }

    // 2. Ejecución Eficiente (Count + Fetch en paralelo)
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find(query)
        // CORRECCIÓN: Agregamos 'descripcion', 'tipo', 'desarrollador' y 'fechaLanzamiento'
        // que son requeridos por el esquema Zod del frontend.
        .select('nombre precio imagenUrl plataformaId generoId stock calificacion descripcion tipo desarrollador fechaLanzamiento') 
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(), 
      Product.countDocuments(query)
    ]);

    // 3. Retorno de DTO
    return {
      data: products,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProductById(id) {
    const product = await Product.findById(id).lean();
    if (!product) {
      throw new Error('ProductNotFound'); 
    }
    return product;
  }

  async createProduct(productData) {
    const newProduct = new Product(productData);
    return await newProduct.save();
  }

  async updateProduct(id, updateData) {
    const product = await Product.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    });
    
    if (!product) {
      throw new Error('ProductNotFound');
    }
    return product;
  }

  async deleteProduct(id) {
    // Soft Delete: Marcar el producto como inactivo en lugar de borrarlo
    const product = await Product.findByIdAndUpdate(
      id, 
      { activo: false }, 
      { new: true }
    );
    
    if (!product) {
      throw new Error('ProductNotFound');
    }
    return product;
  }
}

module.exports = new ProductService();
