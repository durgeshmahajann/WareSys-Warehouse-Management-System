# WareSys Backend — Node.js REST API

A complete backend for the WareSys Warehouse Management System frontend.

---

## Tech Stack

- **Node.js + Express** — REST API
- **MongoDB + Mongoose** — Database & ODM
- **JWT** — Authentication
- **bcryptjs** — Password hashing

---

## Project Structure

```
waresys-backend/
├── src/
│   ├── server.js              # Entry point
│   ├── seed.js                # Seed initial data
│   ├── db/
│   │   ├── connect.js         # MongoDB connection
│   │   └── models.js          # All Mongoose models
│   ├── middleware/
│   │   └── auth.js            # JWT protect + RBAC
│   └── routes/
│       ├── auth.js            # Login, register, /me
│       ├── warehouses.js      # CRUD warehouses
│       ├── products.js        # CRUD products
│       ├── suppliers.js       # CRUD suppliers
│       ├── inventory.js       # Read inventory (filtered)
│       ├── movements.js       # Stock In / Out / Transfer
│       └── ordersAndReports.js # Orders + Reports
├── .env
└── package.json
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/waresys
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=7d
```

### 3. Seed the database
```bash
node src/seed.js
```
This creates 3 users, 3 warehouses, 6 products, 4 suppliers, and 6 inventory records matching the frontend demo data.

### 4. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000`

---

## API Reference

### Auth
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/register` | Admin | Create a new user |
| GET  | `/api/auth/me` | Auth | Get current user |

**Login request:**
```json
{ "email": "admin@waresys.com", "password": "admin123" }
```
**Login response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": { "id": "...", "name": "Admin User", "role": "WAREHOUSE_ADMIN", "initials": "AD" }
}
```

---

### Warehouses — `/api/warehouses`
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| GET    | `/` | Any | List all with utilization |
| POST   | `/` | Admin | Add warehouse |
| PUT    | `/:id` | Admin | Edit warehouse |
| DELETE | `/:id` | Admin | Delete (only if empty) |

---

### Products — `/api/products`
| Method | Route | Permission |
|--------|-------|-----------|
| GET    | `/` | Any |
| POST   | `/` | Admin/Staff (addProduct) |
| PUT    | `/:id` | Admin/Staff |
| DELETE | `/:id` | Admin |

---

### Suppliers — `/api/suppliers`
| Method | Route | Permission |
|--------|-------|-----------|
| GET    | `/` | Any auth |
| POST   | `/` | stockIn permission |

---

### Inventory — `/api/inventory`
| Method | Route | Filters |
|--------|-------|---------|
| GET    | `/` | `?warehouse=<id>&rack=Rack A&status=LOW` |
| GET    | `/:id` | — |

---

### Stock Movements — `/api/movements`
| Method | Route | Permission | Body |
|--------|-------|-----------|------|
| GET    | `/` | Any auth | `?type=IN&limit=50` |
| POST   | `/stock-in` | stockIn | `productId, warehouseId, supplierId, quantity, rack?, bin?` |
| POST   | `/stock-out` | stockOut | `productId, warehouseId, quantity, customer?, notes?` |
| POST   | `/transfer` | transfer | `productId, fromWarehouseId, toWarehouseId, quantity, fromBin?, toBin?` |

---

### Orders — `/api/orders`
| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/` | List orders (`?status=PENDING&type=INBOUND`) |
| PATCH  | `/:id/status` | Update order status |

---

### Reports — `/api/reports`
| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/dashboard` | Dashboard summary stats |
| GET    | `/stock` | Full stock report |
| GET    | `/movement` | All movements summary |
| GET    | `/warehouse` | Warehouse utilization report |

---

## Roles & Permissions

| Action | WAREHOUSE_ADMIN | WAREHOUSE_STAFF | VIEWER |
|--------|:-:|:-:|:-:|
| View dashboard/inventory | ✅ | ✅ | ✅ |
| Add Product | ✅ | ❌ | ❌ |
| Stock In | ✅ | ✅ | ❌ |
| Stock Out | ✅ | ✅ | ❌ |
| Transfer | ✅ | ✅ | ❌ |
| Add/Edit Warehouse | ✅ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ✅ |
| Manage Users | ✅ | ❌ | ❌ |

---

## Connecting the Frontend

In your `index.html`, replace the hardcoded `USERS` object and local DOM mutations with `fetch()` calls to this API.

**Example — Login:**
```javascript
async function doLogin() {
  const res  = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('waresys_token', data.token);
    // proceed to app
  }
}
```

**Auth header for all protected requests:**
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('waresys_token')}`
};
```

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@waresys.com | admin123 |
| Staff | staff@waresys.com | staff123 |
| Viewer | view@waresys.com | view123 |
