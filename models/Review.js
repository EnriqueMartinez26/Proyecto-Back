const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es requerido']
  },
  rating: {
    type: Number,
    required: [true, 'La calificación es requerida'],
    min: [1, 'La calificación mínima es 1'],
    max: [5, 'La calificación máxima es 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  text: {
    type: String,
    required: [true, 'El texto de la reseña es requerido'],
    trim: true,
    minlength: [10, 'La reseña debe tener al menos 10 caracteres'],
    maxlength: [2000, 'La reseña no puede exceder 2000 caracteres']
  },
  // Análisis de sentimiento por IA
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'mixed', null],
    default: null
  },
  sentimentScore: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  sentimentKeywords: {
    type: [String],
    default: []
  },
  // Flag si el usuario compró el producto
  verified: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpfulVoters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Un usuario solo puede dejar una reseña por producto
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
// Consultar reseñas de un producto, ordenadas por recientes
reviewSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
