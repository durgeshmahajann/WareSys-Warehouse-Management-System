const router    = require('express').Router();
const { Product, Inventory } = require('../db/models');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

// GET /api/products
router.get('/', async (req, res) => {
  const products = await Product.find().sort('name');

  // Attach total quantity from inventory
  const invAgg = await Inventory.aggregate([
    { $group: { _id: '$product', totalQty: { $sum: '$quantity' } } }
  ]);
  const qtyMap = {};
  invAgg.forEach(i => { qtyMap[i._id.toString()] = i.totalQty; });

  const result = products.map(p => {
    const qty    = qtyMap[p._id.toString()] || 0;
    let   status = 'OUT';
    if (qty > 0 && qty <= 20)  status = 'LOW';
    else if (qty >= 500)       status = 'OVER';
    else if (qty > 20)         status = 'OK';
    return { id: p._id, name: p.name, sku: p.sku, category: p.category, unit: p.unit, totalQty: qty, status };
  });

  res.json({ success: true, data: result });
});

// POST /api/products
router.post('/', requirePermission('addProduct'), async (req, res) => {
  const { name, sku, category, unit } = req.body;
  if (!name || !sku)
    return res.status(400).json({ success: false, message: 'Name and SKU are required.' });

  const existing = await Product.findOne({ sku: sku.trim() });
  if (existing)
    return res.status(409).json({ success: false, message: `SKU "${sku}" already exists.` });

  const product = await Product.create({ name, sku: sku.trim(), category, unit });
  res.status(201).json({ success: true, data: product });
});

// PUT /api/products/:id
router.put('/:id', requirePermission('addProduct'), async (req, res) => {
  const { name, sku, category, unit } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, sku, category, unit },
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  res.json({ success: true, data: product });
});

// DELETE /api/products/:id
router.delete('/:id', requirePermission('addProduct'), async (req, res) => {
  const hasInventory = await Inventory.exists({ product: req.params.id, quantity: { $gt: 0 } });
  if (hasInventory)
    return res.status(400).json({ success: false, message: 'Cannot delete product with active inventory.' });

  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Product deleted.' });
});

module.exports = router;
