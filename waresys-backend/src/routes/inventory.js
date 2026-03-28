const router    = require('express').Router();
const { Inventory } = require('../db/models');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/inventory?warehouse=&rack=&status=&product=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.warehouse) filter.warehouse = req.query.warehouse;
  if (req.query.rack)      filter.rack = req.query.rack;
  if (req.query.product)   filter.product = req.query.product;

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
    result = result.filter(i => i.status === req.query.status);
  }

  res.json({ success: true, count: result.length, data: result });
});

// GET /api/inventory/:id
router.get('/:id', async (req, res) => {
  const item = await Inventory.findById(req.params.id)
    .populate('product', 'name sku category')
    .populate('warehouse', 'name location');
  if (!item) return res.status(404).json({ success: false, message: 'Inventory record not found.' });
  res.json({ success: true, data: item });
});

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res) => {
  const item = await Inventory.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Inventory record not found.' });
  res.json({ success: true, message: 'Inventory record deleted.' });
});

module.exports = router;
