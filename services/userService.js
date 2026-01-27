const User = require('../models/User');
const logger = require('../utils/logger');

// Obtener todos los usuarios
exports.getAllUsers = async () => {
    const users = await User.find().select('-password');
    logger.info(`Usuarios obtenidos: ${users.length}`);
    return users;
};

// Obtener usuario por ID
exports.getUserById = async (id) => {
    const user = await User.findById(id).select('-password');
    if (!user) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }
    return user;
};

// Actualizar usuario
exports.updateUser = async (id, data) => {
    const { name, email, phone, address } = data;

    const user = await User.findById(id);
    if (!user) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    const updatedUser = await user.save();
    logger.info(`Usuario actualizado: ${updatedUser._id}`);

    return {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address
    };
};

// Eliminar usuario
exports.deleteUser = async (id) => {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }
    logger.info(`Usuario eliminado: ${id}`);
    return true;
};
