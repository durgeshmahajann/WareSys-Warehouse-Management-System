const jwt = require('jsonwebtoken');
const { User } = require('../db/models');

// ── Verify JWT ─────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User no longer exists.' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ── Role-based access control ─────────────────────────────
const ROLE_PERMISSIONS = {
  WAREHOUSE_ADMIN: [
    'addProduct', 'stockIn', 'stockOut', 'transfer',
    'addWarehouse', 'editWarehouse', 'viewReports', 'manageUsers'
  ],
  WAREHOUSE_STAFF: [
    'stockIn', 'stockOut', 'transfer', 'addProduct'
  ],
  VIEWER: ['viewReports']
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`
    });
  }
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  const perms = ROLE_PERMISSIONS[req.user?.role] || [];
  if (!perms.includes(permission)) {
    return res.status(403).json({
      success: false,
      message: `Permission denied: ${permission}`
    });
  }
  next();
};

module.exports = { protect, requireRole, requirePermission };
