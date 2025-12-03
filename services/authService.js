const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
      throw new Error('El email ya está registrado');
    }

    // La encriptación de contraseña se maneja en el modelo o controller antes de guardar
    // (En tu caso actual, usas bcrypt manualmente en el controller, lo mantendremos consistente)
    // Idealmente, esto iría en un middleware 'pre-save' de Mongoose.
    
    // Nota: Para este refactor, asumimos que el hash se hace fuera o el modelo lo maneja. 
    // Sin embargo, para mantener compatibilidad con tu código anterior, devolveremos el objeto para ser creado.
    return { name, email, password }; 
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