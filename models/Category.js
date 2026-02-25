const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^[a-z0-9-]+$/, 'El ID debe ser un slug válido (letras minúsculas, números y guiones)']
    },
    nombre: {
        type: String,
        required: [true, 'El nombre de la categoría es requerido'],
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

categorySchema.index({ nombre: 'text' });

module.exports = mongoose.model('Category', categorySchema);
