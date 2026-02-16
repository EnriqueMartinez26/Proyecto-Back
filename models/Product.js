const mongoose = require('mongoose');
const { PC_SPECS, TOP_DEVELOPERS } = require('../utils/constants');

const productSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida']
  },
  precio: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  plataformaId: {
    type: String,
    required: [true, 'La plataforma es requerida']
  },
  generoId: {
    type: String,
    required: [true, 'El género es requerido']
  },
  tipo: {
    type: String,
    enum: ['Digital', 'Fisico'],
    required: [true, 'El tipo es requerido']
  },
  fechaLanzamiento: {
    type: Date,
    required: [true, 'La fecha de lanzamiento es requerida']
  },
  desarrollador: {
    type: String,
    required: [true, 'El desarrollador es requerido'],
    trim: true
    // Nota: Se removió la validación enum para permitir más flexibilidad
    // La lista TOP_DEVELOPERS se usa como referencia, no como restricción
  },
  imagenUrl: {
    type: String,
    trim: true,
    default: 'https://placehold.co/600x400?text=No+Image'
  },
  trailerUrl: {
    type: String,
    trim: true,
    default: ''
  },
  calificacion: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  cantidadVendida: {
    type: Number,
    default: 0,
    min: 0
  },
  activo: {
    type: Boolean,
    default: true
  },
  // New Fields
  specPreset: {
    type: String,
    enum: ['Low', 'Mid', 'High'],
    required: false
  },
  requisitos: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  descuentoPorcentaje: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  descuentoFechaFin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals for populating based on custom string IDs
productSchema.virtual('platformObj', {
  ref: 'Platform',
  localField: 'plataformaId',
  foreignField: 'id',
  justOne: true
});

productSchema.virtual('genreObj', {
  ref: 'Genre',
  localField: 'generoId',
  foreignField: 'id',
  justOne: true
});

// Índices para búsqueda y filtrado
productSchema.index({ nombre: 'text', descripcion: 'text' });
productSchema.index({ plataformaId: 1 });
productSchema.index({ generoId: 1 });
productSchema.index({ tipo: 1 });
productSchema.index({ precio: 1 });
productSchema.index({ fechaLanzamiento: -1 });
productSchema.index({ activo: 1 });
productSchema.index({ calificacion: -1 });

// Pre-save hook: Auto-populate Requirements based on Preset
productSchema.pre('save', function (next) {
  if (this.specPreset && PC_SPECS[this.specPreset.toUpperCase()]) {
    // Only overwrite if requirements are empty to avoid overwriting custom tweaks?
    // User request implies "choose... and build specs", so we enforce the preset values.
    this.requisitos = PC_SPECS[this.specPreset.toUpperCase()];
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
