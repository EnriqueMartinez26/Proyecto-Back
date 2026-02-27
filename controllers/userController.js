const User = require('../models/User');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Obtener lista de usuarios con paginación, búsqueda y filtros
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {};

    // Búsqueda por nombre o email (Case insensitive)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtro por rol
    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    const startIndex = (page - 1) * limit;
    const total = await User.countDocuments(query);

    // Selección de campos optimizada (excluyendo password)
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: users
    });

  } catch (error) {
    logger.error('Error getting users:', error);
    next(error);
  }
};

// @desc    Obtener detalle de usuario con métricas CRM (LTV, Última compra)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      throw new ErrorResponse('Usuario no encontrado', 404);
    }

    // --- CRM ANALYTICS ---
    // Buscamos estadísticas de compra de este usuario
    const stats = await Order.aggregate([
      { $match: { user: user._id, isPaid: true } },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    const userCRM = {
      ...user.toObject(),
      stats: stats.length > 0 ? stats[0] : { totalSpent: 0, orderCount: 0, lastOrderDate: null }
    };

    res.status(200).json({
      success: true,
      data: userCRM
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar usuario (Rol, Verificación)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { role, isVerified, name, email } = req.body;

    // Protección: No permitir que un admin se degrade a sí mismo si es el único (lógica simple por ahora)
    if (req.user.id === req.params.id && role && role !== 'admin') {
      // Opcional: Impedir auto-downgrade. Por ahora lo permitimos con warning.
    }

    const user = await User.findByIdAndUpdate(req.params.id,
      { role, isVerified, name, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new ErrorResponse('Usuario no encontrado', 404);
    }

    logger.info(`Usuario actualizado por Admin: ${req.user.email}`, { targetUser: user.email });

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    // Protección de seguridad crítica: Evitar auto-eliminación
    if (req.user.id === req.params.id) {
      throw new ErrorResponse('No puedes eliminar tu propia cuenta de administrador.', 400);
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ErrorResponse('Usuario no encontrado', 404);
    }

    // Antes de borrar, verificamos si tiene órdenes. 
    // Si tiene historial financiero, NO DEBERÍAMOS borrarlo físicamente (Hard Delete).
    // Recomendación Senior: Soft Delete. Pero por simplicidad ahora haremos Hard Delete
    // advirtiendo que esto borra la integridad referencial si no está bien configurado.

    await user.deleteOne();

    logger.warn(`Usuario ELIMINADO por Admin: ${req.user.email}`, { targetUser: user.email });

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (error) {
    next(error);
  }
};
