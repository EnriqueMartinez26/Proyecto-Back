const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Precio unitario congelado al momento de compra
    image: String
  }],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'mercadopago'
  },
  paymentResult: {
    id: String,           // ID de la transacción en MP
    status: String,       // approved, pending, rejected
    payment_type: String, // credit_card, account_money, ticket
    email: String
  },
  // ID de la Preferencia de Mercado Pago (para retomar pagos abandonados)
  externalId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  itemsPrice: { type: Number, required: true, default: 0.0 },
  shippingPrice: { type: Number, required: true, default: 0.0 },
  totalPrice: { type: Number, required: true, default: 0.0 },
  
  orderStatus: {
    type: String,
    enum: ['pendiente_pago', 'pagado', 'procesando', 'enviado', 'entregado', 'cancelado', 'reembolsado'],
    default: 'pendiente_pago'
  },
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  isDelivered: { type: Boolean, default: false },
  deliveredAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
