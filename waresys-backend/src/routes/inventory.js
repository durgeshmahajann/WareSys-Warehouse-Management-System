const router    = require('express').Router();
const mongoose  = require('mongoose');
const { Inventory, Product } = require('../db/models');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/inventory?warehouse=&rack=&status=&product=
router.get('/', async (req, res) => {
  const filter = {};

  // Cast to ObjectId so Mongoose matches correctly against ref fields
  try {
    if (req.query.warehouse) filter.warehouse = new mongoose.Types.ObjectId(req.query.warehouse);
    if (req.query.product)   filter.product   = new mongoose.Types.ObjectId(req.query.product);
  } catch (e) {
    // If the value is not a valid ObjectId (e.g. a name string), skip that filter
  }

  if (req.query.rack) filter.rack = req.query.rack;

  const items = await Inventory.find(filter)
    .populate('product',   'name sku category')
    .populate('warehouse', 'name location')
    .sort({ updatedAt: -1 });

  let result = items.map(i => {
    const qty    = i.quantity;
    let   status = 'OUT';
    if (qty > 0 && qty <= 20)  status = 'LOW';
    else if (qty >= 500)       status = 'OVER';
    else if (qty > 20)         status = 'OK';
    return {
      _id:       i._id,
      id:        i._id,
      product:   i.product,
      warehouse: i.warehouse,
      rack:      i.rack,
      bin:       i.bin,
      quantity:  qty,
      status,
      updatedAt: i.updatedAt
    };
  });

  if (req.query.status) {
    result = result.filter(i => i.status === req.query.status.toUpperCase());
  }

  res.json({ success: true, count: result.length, data: result });
});

// GET /api/inventory/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('product', 'name sku category')
      .populate('warehouse', 'name location');
    if (!item) return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/inventory/:id  — edit rack, bin, sku
router.patch('/:id', async (req, res) => {
  try {
    const { rack, bin, sku } = req.body;

    // Update rack/bin on the Inventory document
    const updateFields = {};
    if (rack !== undefined) updateFields.rack = rack;
    if (bin  !== undefined) updateFields.bin  = bin;

    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('product', 'name sku category').populate('warehouse', 'name location');

    if (!item) return res.status(404).json({ success: false, message: 'Inventory record not found.' });

    // If SKU was provided, update it on the linked Product
    if (sku && item.product) {
      await Product.findByIdAndUpdate(item.product._id, { $set: { sku } });
      item.product.sku = sku; // reflect in response
    }

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    res.json({ success: true, message: 'Inventory record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
