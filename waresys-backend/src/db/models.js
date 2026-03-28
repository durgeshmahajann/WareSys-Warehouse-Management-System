const mongoose = require('mongoose');

// ══════════════════════════════════
// USER
// ══════════════════════════════════
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['WAREHOUSE_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'], default: 'VIEWER' },
  initials: { type: String, required: true }
}, { timestamps: true });

// ══════════════════════════════════
// WAREHOUSE
// ══════════════════════════════════
const warehouseSchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true },
  location:  { type: String, required: true },
  sections:  { type: Number, required: true, min: 1 },
  racks:     { type: Number, required: true, min: 1 },
  bins:      { type: Number, required: true, min: 1 },
  status:    { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });

// Virtual: total bin capacity
warehouseSchema.virtual('capacity').get(function () {
  return this.bins;
});

// ══════════════════════════════════
// PRODUCT
// ══════════════════════════════════
const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  sku:      { type: String, required: true, unique: true },
  category: { type: String, default: 'Other' },
  unit:     { type: String, default: 'pcs' }
}, { timestamps: true });

// ══════════════════════════════════
// SUPPLIER
// ══════════════════════════════════
const supplierSchema = new mongoose.Schema({
  name:    { type: String, required: true, unique: true },
  contact: { type: String },
  phone:   { type: String },
  email:   { type: String },
  city:    { type: String }
}, { timestamps: true });

// ══════════════════════════════════
// INVENTORY (per product per warehouse location)
// ══════════════════════════════════
const inventorySchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  rack:      { type: String, default: '—' },
  bin:       { type: String, default: '—' },
  quantity:  { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });

// Compound index: one record per product per warehouse
inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });

// Virtual: stock status
inventorySchema.virtual('status').get(function () {
  if (this.quantity === 0) return 'OUT';
  if (this.quantity <= 20) return 'LOW';
  if (this.quantity >= 500) return 'OVER';
  return 'OK';
});

// ══════════════════════════════════
// STOCK MOVEMENT
// ══════════════════════════════════
const movementSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type:         { type: String, enum: ['IN', 'OUT', 'TRANSFER'], required: true },
  quantity:     { type: Number, required: true, min: 1 },
  fromWarehouse:{ type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  toWarehouse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  fromBin:      { type: String, default: '—' },
  toBin:        { type: String, default: '—' },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  customer:     { type: String, default: '' },
  reference:    { type: String, default: '' },
  notes:        { type: String, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// ══════════════════════════════════
// ORDER
// ══════════════════════════════════
const orderSchema = new mongoose.Schema({
  orderId:  { type: String, required: true, unique: true },
  type:     { type: String, enum: ['INBOUND', 'OUTBOUND', 'TRANSFER'], required: true },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  status:   { type: String, enum: ['PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED'], default: 'PENDING' },
  movement: { type: mongoose.Schema.Types.ObjectId, ref: 'Movement', default: null }
}, { timestamps: true });

module.exports = {
  User:      mongoose.model('User',      userSchema),
  Warehouse: mongoose.model('Warehouse', warehouseSchema),
  Product:   mongoose.model('Product',   productSchema),
  Supplier:  mongoose.model('Supplier',  supplierSchema),
  Inventory: mongoose.model('Inventory', inventorySchema),
  Movement:  mongoose.model('Movement',  movementSchema),
  Order:     mongoose.model('Order',     orderSchema)
};
