const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  // Generar JWT
  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });
  }

  async register(userData) {
    const { name, email, password } = userData;

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new Error('Credenciales inválidas'); // User Enumeration Prevention
    }

    // Move hashing here
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    return user;
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Credenciales inválidas');
    }
    return user;
  }
}

module.exports = new AuthService();