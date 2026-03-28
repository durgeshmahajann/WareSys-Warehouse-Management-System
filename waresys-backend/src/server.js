require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const connectDB  = require('./db/connect');

const authRouter       = require('./routes/auth');
const warehousesRouter = require('./routes/warehouses');
const productsRouter   = require('./routes/products');
const suppliersRouter  = require('./routes/suppliers');
const inventoryRouter  = require('./routes/inventory');
const movementsRouter  = require('./routes/movements');
const { ordersRouter, reportsRouter } = require('./routes/ordersAndReports');

const app  = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../')));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth',       authRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/products',   productsRouter);
app.use('/api/suppliers',  suppliersRouter);
app.use('/api/inventory',  inventoryRouter);
app.use('/api/movements',  movementsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/reports',    reportsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 WareSys API running on http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health\n`);
});