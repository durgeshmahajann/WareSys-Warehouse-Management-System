const router    = require('express').Router();
const { Warehouse, Inventory } = require('../db/models');
const { protect, requirePermission } = require('../middleware/auth');

// All routes require auth
router.use(protect);

// GET /api/warehouses — list all with live utilization
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort('name');

    // Compute utilization per warehouse from inventory
    const invAgg = await Inventory.aggregate([
      { $group: { _id: '$warehouse', totalUnits: { $sum: '$quantity' } } }
    ]);
    const utilMap = {};
    invAgg.forEach(i => { utilMap[i._id.toString()] = i.totalUnits; });

    const result = warehouses.map(wh => {
      const occupied = utilMap[wh._id.toString()] || 0;
      const util     = wh.bins > 0 ? Math.min(100, Math.round((occupied / wh.bins) * 100)) : 0;
      return {
        id:          wh._id,
        name:        wh.name,
        location:    wh.location,
        sections:    wh.sections,
        racks:       wh.racks,
        bins:        wh.bins,
        status:      wh.status,
        occupied,
        utilization: util
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/warehouses — create
router.post('/', requirePermission('addWarehouse'), async (req, res) => {
  try {
    const { name, location, sections, racks, bins } = req.body;

    if (!name || !location || !sections || !racks || !bins)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    const existing = await Warehouse.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing)
      return res.status(409).json({ success: false, message: `Warehouse "${name}" already exists.` });

    const wh = await Warehouse.create({ name, location, sections, racks, bins });
    res.status(201).json({ success: true, data: wh });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/warehouses/:id — edit
router.put('/:id', requirePermission('editWarehouse'), async (req, res) => {
  try {
    const { name, location, sections, racks, bins } = req.body;

    // Duplicate name check (excluding current)
    if (name) {
      const dup = await Warehouse.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        _id:  { $ne: req.params.id }
      });
      if (dup)
        return res.status(409).json({ success: false, message: `Warehouse "${name}" already exists.` });
    }

    const wh = await Warehouse.findByIdAndUpdate(
      req.params.id,
      { name, location, sections, racks, bins },
      { new: true, runValidators: true }
    );

    if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    res.json({ success: true, data: wh });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/warehouses/:id
router.delete('/:id', requirePermission('editWarehouse'), async (req, res) => {
  try {
    const hasInventory = await Inventory.exists({ warehouse: req.params.id, quantity: { $gt: 0 } });
    if (hasInventory)
      return res.status(400).json({ success: false, message: 'Cannot delete warehouse with active inventory.' });

    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Warehouse deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
