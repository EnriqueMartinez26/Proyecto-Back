const Product = require('../models/Product');

// Obtener todos los productos
exports.getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, featured } = req.query;
    const query = { active: true };

    // Filtros
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (featured) query.featured = featured === 'true';
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Ordenamiento
    let sortOptions = {};
    if (sort === 'price-asc') sortOptions.price = 1;
    if (sort === 'price-desc') sortOptions.price = -1;
    if (sort === 'newest') sortOptions.createdAt = -1;
    if (sort === 'name') sortOptions.name = 1;

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sortOptions);

    res.json({ 
      success: true, 
      count: products.length, 
      products 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtener producto por ID
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Producto no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Crear producto
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ 
      success: true,
      message: 'Producto creado exitosamente',
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Producto no encontrado' 
      });
    }

    res.json({ 
      success: true,
      message: 'Producto actualizado exitosamente',
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Producto no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Producto eliminado exitosamente' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
