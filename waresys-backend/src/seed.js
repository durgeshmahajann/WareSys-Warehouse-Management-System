require('dotenv').config();
const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./db/connect');
const { User, Warehouse, Product, Supplier, Inventory } = require('./db/models');

async function seed() {
  await connectDB();
  console.log('🌱 Seeding WareSys database...\n');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Warehouse.deleteMany({}),
    Product.deleteMany({}),
    Supplier.deleteMany({}),
    Inventory.deleteMany({})
  ]);
  console.log('🗑  Cleared existing data');

  // ── Users ───────────────────────────────────────────────
  const hash = (pw) => bcrypt.hash(pw, 10);
  const users = await User.insertMany([
    { name: 'Admin User',   email: 'admin@waresys.com', password: await hash('admin123'), role: 'WAREHOUSE_ADMIN', initials: 'AD' },
    { name: 'Staff Member', email: 'staff@waresys.com', password: await hash('staff123'), role: 'WAREHOUSE_STAFF', initials: 'ST' },
    { name: 'View Only',    email: 'view@waresys.com',  password: await hash('view123'),  role: 'VIEWER',          initials: 'VO' }
  ]);
  console.log(`✅ ${users.length} users created`);

  // ── Warehouses ──────────────────────────────────────────
  const warehouses = await Warehouse.insertMany([
    { name: 'Warehouse 1', location: 'Mumbai North',  sections: 6, racks: 24, bins: 1512 },
    { name: 'Warehouse 2', location: 'Pune Central',  sections: 4, racks: 18, bins: 1200 },
    { name: 'Warehouse 3', location: 'Nashik Depot',  sections: 3, racks: 12, bins: 1000 }
  ]);
  const [wh1, wh2, wh3] = warehouses;
  console.log(`✅ ${warehouses.length} warehouses created`);

  // ── Suppliers ───────────────────────────────────────────
  const suppliers = await Supplier.insertMany([
    { name: 'BoltMart Pvt Ltd',   contact: 'Ravi Kumar',   phone: '+91 98765 43210', email: 'sales@boltmart.in',  city: 'Mumbai'    },
    { name: 'MetalWorks Co.',      contact: 'Anita Shah',   phone: '+91 99887 76655', email: 'info@metalworks.in', city: 'Pune'      },
    { name: 'SealPro Industries',  contact: 'Deepak Nair',  phone: '+91 97654 32109', email: 'seal@sealpro.in',    city: 'Nashik'    },
    { name: 'PipeLine Corp',       contact: 'Priya Singh',  phone: '+91 96543 21098', email: 'info@pipeline.in',   city: 'Nagpur'    }
  ]);
  console.log(`✅ ${suppliers.length} suppliers created`);

  // ── Products ────────────────────────────────────────────
  const products = await Product.insertMany([
    { name: 'Steel Bolt M10',    sku: 'SKU-00421', category: 'Fasteners' },
    { name: 'Hex Nut M8',        sku: 'SKU-00519', category: 'Fasteners' },
    { name: 'PVC Pipe 2in',      sku: 'SKU-01023', category: 'Plumbing'  },
    { name: 'Cable Tie 30cm',    sku: 'SKU-00872', category: 'Electrical'},
    { name: 'Rubber Gasket A',   sku: 'SKU-00334', category: 'Seals'     },
    { name: 'Copper Elbow 45°',  sku: 'SKU-00612', category: 'Plumbing'  }
  ]);
  const [bolt, nut, pvc, cable, gasket, copper] = products;
  console.log(`✅ ${products.length} products created`);

  // ── Inventory ───────────────────────────────────────────
  const inventory = await Inventory.insertMany([
    { product: bolt._id,   warehouse: wh1._id, rack: 'Rack A', bin: 'Bin 03', quantity: 320  },
    { product: nut._id,    warehouse: wh1._id, rack: 'Rack B', bin: 'Bin 07', quantity: 18   },
    { product: pvc._id,    warehouse: wh2._id, rack: 'Rack C', bin: 'Bin 01', quantity: 540  },
    { product: cable._id,  warehouse: wh1._id, rack: 'Rack A', bin: 'Bin 09', quantity: 1200 },
    { product: gasket._id, warehouse: wh3._id, rack: 'Rack D', bin: 'Bin 02', quantity: 7    },
    { product: copper._id, warehouse: wh2._id, rack: 'Rack A', bin: 'Bin 05', quantity: 95   }
  ]);
  console.log(`✅ ${inventory.length} inventory records created`);

  console.log('\n🎉 Seed complete! You can now start the server.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
