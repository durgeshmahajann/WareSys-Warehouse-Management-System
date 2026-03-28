const router    = require('express').Router();
const mongoose  = require('mongoose');
const { Movement, Inventory, Warehouse, Product, Supplier, Order } = require('../db/models');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

// GET /api/movements?type=&product=&limit=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.type)    filter.type = req.query.type.toUpperCase();
  if (req.query.product) filter.product = req.query.product;

  const limit = parseInt(req.query.limit) || 50;

  const movements = await Movement.find(filter)
    .populate('product',       'name sku')
    .populate('fromWarehouse', 'name')
    .populate('toWarehouse',   'name')
    .populate('supplier',      'name')
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ success: true, count: movements.length, data: movements });
});

// ── Shared helper: resolve or create an Inventory record ──
async function getOrCreateInventory(productId, warehouseId) {
  let inv = await Inventory.findOne({ product: productId, warehouse: warehouseId });
  if (!inv) {
    inv = await Inventory.create({ product: productId, warehouse: warehouseId, quantity: 0 });
  }
  return inv;
}

// ── Shared helper: check warehouse capacity ──
async function checkCapacity(warehouseId, addingQty) {
  const wh = await Warehouse.findById(warehouseId);
  if (!wh) throw new Error('Warehouse not found.');

  const agg = await Inventory.aggregate([
    { $match: { warehouse: new mongoose.Types.ObjectId(warehouseId) } },
    { $group: { _id: null, total: { $sum: '$quantity' } } }
  ]);
  const occupied = agg[0]?.total || 0;
  const space    = wh.bins - occupied;

  if (addingQty > space) {
    const msg = space <= 0
      ? `"${wh.name}" is full — 0 units of space remaining.`
      : `"${wh.name}" only has ${space.toLocaleString()} units of space remaining (capacity: ${wh.bins.toLocaleString()}).`;
    throw new Error(msg);
  }
  return wh;
}

// ── Generate a reference ID ──
function genRef(prefix) {
  return `${prefix}-${Date.now().toString().slice(-4).padStart(4, '0')}`;
}

// ────────────────────────────────────────────────────────────
// POST /api/movements/stock-in
// ────────────────────────────────────────────────────────────
router.post('/stock-in', requirePermission('stockIn'), async (req, res) => {
  const { productId, warehouseId, supplierId, quantity, rack, bin, sku } = req.body;

  if (!productId || !warehouseId || !supplierId || !quantity)
    return res.status(400).json({ success: false, message: 'productId, warehouseId, supplierId and quantity are required.' });

  if (quantity <= 0)
    return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });

  const [product, supplier] = await Promise.all([
    Product.findById(productId),
    Supplier.findById(supplierId)
  ]);
  if (!product)  return res.status(404).json({ success: false, message: 'Product not found.' });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

  try {
    await checkCapacity(warehouseId, quantity);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Update inventory
  const inv = await getOrCreateInventory(productId, warehouseId);
  if (rack) inv.rack = rack;
  if (bin)  inv.bin  = bin;
  inv.quantity += quantity;
  await inv.save();

  // Log movement
  const ref = genRef('INB');
  const movement = await Movement.create({
    product:     productId,
    type:        'IN',
    quantity,
    toWarehouse: warehouseId,
    fromBin:     '—',
    toBin:       bin || '—',
    supplier:    supplierId,
    reference:   ref,
    createdBy:   req.user._id
  });

  // Create order record
  await Order.create({
    orderId:  ref,
    type:     'INBOUND',
    product:  productId,
    quantity,
    status:   'RECEIVED',
    movement: movement._id
  });

  res.status(201).json({ success: true, data: movement, message: `Stocked in ${quantity} × ${product.name}` });
});

// ────────────────────────────────────────────────────────────
// POST /api/movements/stock-out
// ────────────────────────────────────────────────────────────
router.post('/stock-out', requirePermission('stockOut'), async (req, res) => {
  const { productId, warehouseId, quantity, customer, notes } = req.body;

  if (!productId || !warehouseId || !quantity)
    return res.status(400).json({ success: false, message: 'productId, warehouseId and quantity are required.' });

  if (quantity <= 0)
    return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });

  const inv = await Inventory.findOne({ product: productId, warehouse: warehouseId })
    .populate('product', 'name');

  if (!inv)
    return res.status(404).json({ success: false, message: 'Product not found in this warehouse.' });

  if (quantity > inv.quantity)
    return res.status(400).json({
      success: false,
      message: `Cannot dispatch ${quantity} units — only ${inv.quantity} in stock.`
    });

  inv.quantity -= quantity;
  await inv.save();

  const ref = genRef('OUT');
  const movement = await Movement.create({
    product:       productId,
    type:          'OUT',
    quantity,
    fromWarehouse: warehouseId,
    fromBin:       inv.bin,
    customer,
    reference:     req.body.reference || ref,
    notes,
    createdBy:     req.user._id
  });

  await Order.create({
    orderId:  ref,
    type:     'OUTBOUND',
    product:  productId,
    quantity,
    status:   'DISPATCHED',
    movement: movement._id
  });

  res.status(201).json({ success: true, data: movement, message: `Dispatched ${quantity} × ${inv.product.name}` });
});

// ────────────────────────────────────────────────────────────
// POST /api/movements/transfer
// ────────────────────────────────────────────────────────────
router.post('/transfer', requirePermission('transfer'), async (req, res) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity, fromBin, toBin } = req.body;

  if (!productId || !fromWarehouseId || !toWarehouseId || !quantity)
    return res.status(400).json({ success: false, message: 'productId, fromWarehouseId, toWarehouseId and quantity are required.' });

  if (fromWarehouseId === toWarehouseId)
    return res.status(400).json({ success: false, message: 'From and To warehouses must be different.' });

  const sourceInv = await Inventory.findOne({ product: productId, warehouse: fromWarehouseId })
    .populate('product', 'name');

  if (!sourceInv)
    return res.status(404).json({ success: false, message: 'Product not found in source warehouse.' });

  if (quantity > sourceInv.quantity)
    return res.status(400).json({ success: false, message: `Only ${sourceInv.quantity} units available in source warehouse.` });

  try {
    await checkCapacity(toWarehouseId, quantity);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Deduct from source
  sourceInv.quantity -= quantity;
  await sourceInv.save();

  // Add to destination
  const destInv = await getOrCreateInventory(productId, toWarehouseId);
  destInv.quantity += quantity;
  if (toBin) destInv.bin = toBin;
  await destInv.save();

  const ref = genRef('XFR');
  const movement = await Movement.create({
    product:       productId,
    type:          'TRANSFER',
    quantity,
    fromWarehouse: fromWarehouseId,
    toWarehouse:   toWarehouseId,
    fromBin:       fromBin || sourceInv.bin || '—',
    toBin:         toBin || '—',
    reference:     ref,
    createdBy:     req.user._id
  });

  await Order.create({
    orderId:  ref,
    type:     'TRANSFER',
    product:  productId,
    quantity,
    status:   'DISPATCHED',
    movement: movement._id
  });

  res.status(201).json({ success: true, data: movement, message: `Transferred ${quantity} × ${sourceInv.product.name}` });
});

module.exports = router;
