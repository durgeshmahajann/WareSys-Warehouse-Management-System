const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { User } = require('../db/models');
const { protect } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        initials: user.initials
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register  (Admin only — seed or create users)
router.post('/register', protect, async (req, res) => {
  try {
    if (req.user.role !== 'WAREHOUSE_ADMIN')
      return res.status(403).json({ success: false, message: 'Only admins can create users.' });

    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });

    const hash     = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const user     = await User.create({ name, email: email.toLowerCase(), password: hash, role: role || 'VIEWER', initials });

    res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, initials: user.initials }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  try {
    const { _id, name, email, role, initials } = req.user;
    res.json({ success: true, user: { id: _id, name, email, role, initials } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
