const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del género es requerido'],
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  imageId: {
    type: String,
    default: 'https://placehold.co/600x400?text=No+Image'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Genre', genreSchema);