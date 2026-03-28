const router = require('express').Router();
const { Supplier } = require('../db/models');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

// GET /api/suppliers
router.get('/', async (req, res) => {
  const suppliers = await Supplier.find().sort('name');
  res.json({ success: true, data: suppliers });
});

// POST /api/suppliers
router.post('/', requirePermission('stockIn'), async (req, res) => {
  const { name, contact, phone, email, city } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: 'Supplier name is required.' });

  const existing = await Supplier.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
  if (existing)
    return res.status(409).json({ success: false, message: `Supplier "${name}" already exists.` });

  const supplier = await Supplier.create({ name, contact, phone, email, city });
  res.status(201).json({ success: true, data: supplier });
});

module.exports = router;
