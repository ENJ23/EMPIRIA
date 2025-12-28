const User = require('../models/User');

/**
 * Middleware: requireAdmin
 * Requires validarJWT to have set req.uid.
 * Loads the user and checks `tipo === 'Admin'`.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.uid;
    if (!uid) {
      return res.status(401).json({ status: 0, msg: 'Token requerido' });
    }
    const user = await User.findById(uid).select('tipo');
    if (!user) {
      return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
    }
    if (user.tipo !== 'Admin') {
      return res.status(403).json({ status: 0, msg: 'Acceso restringido a administradores' });
    }
    next();
  } catch (e) {
    console.error('[requireAdmin] Error:', e.message);
    return res.status(500).json({ status: 0, msg: 'Error interno' });
  }
};

module.exports = { requireAdmin };
