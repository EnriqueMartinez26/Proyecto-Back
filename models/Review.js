const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  calificacion: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comentario: {
    type: String,
    trim: true
  },
  verificado: {
    type: Boolean,
    default: false
  },
  util: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices
reviewSchema.index({ productoId: 1 });
reviewSchema.index({ usuarioId: 1 });
reviewSchema.index({ calificacion: 1 });

// Un usuario solo puede hacer una reseña por producto
reviewSchema.index({ productoId: 1, usuarioId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);