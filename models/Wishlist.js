const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  productos: [{
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    fechaAgregado: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Índice único para usuario
wishlistSchema.index({ usuarioId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);