// ── ORDERS ────────────────────────────────────────────────
const ordersRouter = require('express').Router();
const { Order }    = require('../db/models');
const { protect }  = require('../middleware/auth');

ordersRouter.use(protect);

// GET /api/orders
ordersRouter.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type)   filter.type   = req.query.type;

  const orders = await Order.find(filter)
    .populate('product', 'name sku')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ success: true, count: orders.length, data: orders });
});

// PATCH /api/orders/:id/status
ordersRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED'];
  if (!valid.includes(status))
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${valid.join(', ')}` });

  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, data: order });
});

// ── REPORTS ───────────────────────────────────────────────
const reportsRouter  = require('express').Router();
const { Inventory, Movement, Warehouse, Product } = require('../db/models');
const mongoose = require('mongoose');

reportsRouter.use(protect);

// GET /api/reports/stock
reportsRouter.get('/stock', async (req, res) => {
  const items = await Inventory.find()
    .populate('product',   'name sku category')
    .populate('warehouse', 'name location');

  let totalUnits = 0, lowCount = 0, outCount = 0, overCount = 0;
  const data = items.map(i => {
    const qty = i.quantity;
    let status = 'OUT';
    if (qty > 0 && qty <= 20)  { status = 'LOW';  lowCount++;  }
    else if (qty >= 500)       { status = 'OVER'; overCount++; }
    else if (qty > 20)           status = 'OK';
    if (qty === 0) outCount++;
    totalUnits += qty;
    return { product: i.product, warehouse: i.warehouse, rack: i.rack, bin: i.bin, quantity: qty, status };
  });

  res.json({
    success: true,
    summary: { totalSKUs: items.length, totalUnits, lowCount, outCount, overCount },
    data
  });
});

// GET /api/reports/movement
reportsRouter.get('/movement', async (req, res) => {
  const movements = await Movement.find()
    .populate('product',       'name sku')
    .populate('fromWarehouse', 'name')
    .populate('toWarehouse',   'name')
    .sort({ createdAt: -1 })
    .limit(200);

  const summary = { inCount: 0, outCount: 0, xferCount: 0, inUnits: 0, outUnits: 0, xferUnits: 0, total: movements.length };
  movements.forEach(m => {
    if (m.type === 'IN')       { summary.inCount++;   summary.inUnits   += m.quantity; }
    if (m.type === 'OUT')      { summary.outCount++;  summary.outUnits  += m.quantity; }
    if (m.type === 'TRANSFER') { summary.xferCount++; summary.xferUnits += m.quantity; }
  });

  res.json({ success: true, summary, data: movements });
});

// GET /api/reports/warehouse
reportsRouter.get('/warehouse', async (req, res) => {
  const warehouses = await Warehouse.find();
  const invAgg     = await Inventory.aggregate([
    { $group: { _id: '$warehouse', totalUnits: { $sum: '$quantity' }, skus: { $sum: 1 } } }
  ]);

  const utilMap = {};
  invAgg.forEach(i => { utilMap[i._id.toString()] = { units: i.totalUnits, skus: i.skus }; });

  let totalCap = 0, totalUnits = 0;
  const data = warehouses.map(wh => {
    const u    = utilMap[wh._id.toString()] || { units: 0, skus: 0 };
    const util = wh.bins > 0 ? Math.min(100, Math.round((u.units / wh.bins) * 100)) : 0;
    totalCap   += wh.bins;
    totalUnits += u.units;
    return {
      id:          wh._id,
      name:        wh.name,
      location:    wh.location,
      capacity:    wh.bins,
      occupied:    u.units,
      skus:        u.skus,
      utilization: util,
      status:      util >= 85 ? 'NEAR FULL' : 'ACTIVE'
    };
  });

  const avgUtil = totalCap > 0 ? Math.round((totalUnits / totalCap) * 100) : 0;
  res.json({
    success: true,
    summary: { totalWarehouses: warehouses.length, totalCap, totalUnits, avgUtil },
    data
  });
});

// GET /api/reports/dashboard  (summary stats for the main dashboard)
reportsRouter.get('/dashboard', async (req, res) => {
  const [productCount, invAgg, lowItems, orders] = await Promise.all([
    Product.countDocuments(),
    Inventory.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' } } }]),
    Inventory.countDocuments({ quantity: { $gt: 0, $lte: 20 } }),
    require('../db/models').Order.countDocuments({ status: { $in: ['PENDING', 'DISPATCHED'] } })
  ]);

  res.json({
    success: true,
    data: {
      totalProducts:   productCount,
      totalStockUnits: invAgg[0]?.total || 0,
      lowStockAlerts:  lowItems,
      activeOrders:    orders
    }
  });
});

module.exports = { ordersRouter, reportsRouter };
