const mongoose = require('mongoose');

const digitalKeySchema = new mongoose.Schema({
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  clave: {
    type: String,
    required: true,
    unique: true
  },
  estado: {
    type: String,
    enum: ['DISPONIBLE', 'VENDIDA', 'RESERVADA'],
    default: 'DISPONIBLE'
  },
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  fechaVenta: Date
}, {
  timestamps: true
});

// Índices
digitalKeySchema.index({ productoId: 1 });
digitalKeySchema.index({ estado: 1 });
digitalKeySchema.index({ clave: 1 }, { unique: true });

module.exports = mongoose.model('DigitalKey', digitalKeySchema);