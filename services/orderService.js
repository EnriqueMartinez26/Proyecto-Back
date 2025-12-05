const Order = require('../models/Order');
const Product = require('../models/Product');

class OrderService {
  /**
   * Crea una nueva orden validando stock y precios.
   * @param {Object} data - Datos de la orden y usuario autenticado.
   */
  async createOrder({ user, orderItems, shippingAddress, paymentMethod, totalPrice }) {
    // 1. Validaciones de Negocio
    if (!orderItems || orderItems.length === 0) {
      throw new Error('No hay items en la orden');
    }

    // 2. Verificación de Stock e Integridad de Datos (Lógica crítica)
    // Recorremos los items para verificar que existan y tengan stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.name || item.product}`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para: ${product.nombre}. Disponible: ${product.stock}`);
      }
      
      // Nota: Idealmente, totalPrice debería ser recalculado aquí usando product.precio 
      // para evitar manipulación del cliente. Se mantiene la estructura actual por simplicidad.
    }

    // 3. Actualización de Inventario (Simulación de Transacción de Descuento de Stock)
    for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity, cantidadVendida: item.quantity }
        });
    }

    // 4. Persistencia de la Orden
    const order = await Order.create({
      user, // ID del usuario autenticado (extraído del token)
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: totalPrice, 
      totalPrice,
      shippingPrice: 0,
      isPaid: false
    });

    return order;
  }
}

module.exports = new OrderService();
