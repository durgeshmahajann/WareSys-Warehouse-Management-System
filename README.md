<div align="center">

<img src="https://img.shields.io/badge/WareSys-WMS%20v2.1-2563eb?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0yIDIxVjdsMTAtNSAxMCA1djE0SDJ6bTItMmgxNlY4LjI1TDEyIDRsLTggNC4yNVYxOXptNi03aDR2Mkg5di0xbC0xLTF2LTRoNHYybC0xIDF2MnoiLz48L3N2Zz4=" alt="WareSys"/>

# WareSys

**A full-stack Warehouse Management System with role-based access, real-time stock control, and multi-warehouse support.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![JWT](https://img.shields.io/badge/JWT-Auth-FB015B?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#-features) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Roles](#-roles--permissions) · [Frontend](#-connecting-the-frontend)

</div>

---

## 📸 Preview

> WareSys is a single-HTML-file frontend paired with a Node.js/MongoDB REST API backend. Dark/light theme, Syne + IBM Plex Mono typography, and a grid-overlay aesthetic.

| Dashboard | Inventory | Stock Movement |
|---|---|---|
| Stats cards, warehouse utilization map, recent movements | Filter by warehouse, rack, status · inline stock-out | Stock In / Out / Transfer with capacity validation |

---

## ✨ Features

- 🔐 **JWT Authentication** with role-based access control (Admin / Staff / Viewer)
- 🏗 **Multi-Warehouse Management** — add, edit, capacity tracking, utilization %
- 📦 **Product & Inventory Tracking** — per-warehouse, per-rack, per-bin granularity
- 📥📤 **Stock In / Out / Transfer** — with real-time capacity checks and movement logging
- 🚚 **Order Management** — auto-generated inbound/outbound/transfer order records
- 📊 **Reports** — Stock, Movement, and Warehouse utilization reports
- 🔍 **Global Search** — across inventory, warehouses, and movement history
- 🌙 **Dark / Light Theme** — persisted via localStorage

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & install
```bash
git clone https://github.com/yourusername/waresys.git
cd waresys/backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/waresys
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=7d
```

### 3. Seed the database
```bash
node src/seed.js
```

This populates 3 warehouses, 6 products, 4 suppliers, and 3 demo users.

### 4. Start the server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server runs at `http://localhost:3000`  
Health check: `GET /api/health`

---

## 📁 Project Structure
```
waresys-backend/
├── src/
│   ├── server.js                   # Express app + route mounting
│   ├── seed.js                     # Database seeder
│   ├── db/
│   │   ├── connect.js              # MongoDB connection
│   │   └── models.js               # Mongoose models (7 schemas)
│   ├── middleware/
│   │   └── auth.js                 # JWT protect + RBAC middleware
│   └── routes/
│       ├── auth.js                 # Login · Register · /me
│       ├── warehouses.js           # CRUD + live utilization
│       ├── products.js             # CRUD + inventory-linked totals
│       ├── suppliers.js            # List + create
│       ├── inventory.js            # Read with filters
│       ├── movements.js            # Stock In · Out · Transfer
│       └── ordersAndReports.js     # Orders + 4 report endpoints
├── .env
└── package.json
```

---

## 📡 API Reference

All protected routes require:
```
Authorization: Bearer <token>
```

---

### 🔑 Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/login` | Public | Returns JWT token |
| `POST` | `/register` | Admin | Create a new user |
| `GET` | `/me` | Any | Current user info |

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@waresys.com","password":"admin123"}'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@waresys.com",
    "role": "WAREHOUSE_ADMIN",
    "initials": "AD"
  }
}
```

---

### 🏗 Warehouses — `/api/warehouses`

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `GET` | `/` | Any auth | List all + live utilization % |
| `POST` | `/` | Admin | Create warehouse |
| `PUT` | `/:id` | Admin | Update warehouse |
| `DELETE` | `/:id` | Admin | Delete (blocks if inventory exists) |

**Create warehouse body:**
```json
{
  "name": "Warehouse 4",
  "location": "Nagpur",
  "sections": 4,
  "racks": 16,
  "bins": 800
}
```

---

### 📦 Products — `/api/products`

| Method | Endpoint | Permission |
|--------|----------|-----------|
| `GET` | `/` | Any auth |
| `POST` | `/` | Admin |
| `PUT` | `/:id` | Admin |
| `DELETE` | `/:id` | Admin |

---

### 🚚 Stock Movements — `/api/movements`

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `GET` | `/` | Any auth | `?type=IN&limit=50` |
| `POST` | `/stock-in` | Staff+ | Receive stock from supplier |
| `POST` | `/stock-out` | Staff+ | Dispatch stock |
| `POST` | `/transfer` | Staff+ | Move between warehouses |

**Stock In body:**
```json
{
  "productId": "....",
  "warehouseId": "...",
  "supplierId": "...",
  "quantity": 200,
  "rack": "Rack A",
  "bin": "Bin 03"
}
```

**Stock Out body:**
```json
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 50,
  "customer": "ABC Corp",
  "notes": "Customer order"
}
```

**Transfer body:**
```json
{
  "productId": "...",
  "fromWarehouseId": "...",
  "toWarehouseId": "...",
  "quantity": 30,
  "fromBin": "Bin 03",
  "toBin": "Bin 07"
}
```

---

### 🗂 Inventory — `/api/inventory`

| Method | Endpoint | Query Params |
|--------|----------|-------------|
| `GET` | `/` | `?warehouse=<id>&rack=Rack A&status=LOW` |
| `GET` | `/:id` | — |

Status values: `OK` · `LOW` · `OVER` · `OUT`

---

### 📋 Orders — `/api/orders`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | `?status=PENDING&type=INBOUND` |
| `PATCH` | `/:id/status` | Update order status |

---

### 📊 Reports — `/api/reports`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard` | Summary stats (products, stock units, alerts, orders) |
| `GET` | `/stock` | Full inventory report with per-SKU breakdown |
| `GET` | `/movement` | All movement transactions with IN/OUT/TRANSFER totals |
| `GET` | `/warehouse` | Per-warehouse capacity + utilization report |

---

## 👥 Roles & Permissions

| Action | `WAREHOUSE_ADMIN` | `WAREHOUSE_STAFF` | `VIEWER` |
|--------|:-----------------:|:-----------------:|:--------:|
| View Dashboard & Inventory | ✅ | ✅ | ✅ |
| View Reports | ✅ | ❌ | ✅ |
| Stock In | ✅ | ✅ | ❌ |
| Stock Out | ✅ | ✅ | ❌ |
| Transfer Stock | ✅ | ✅ | ❌ |
| Add/Edit Products | ✅ | ❌ | ❌ |
| Add/Edit Warehouses | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |

---

## 🔗 Connecting the Frontend

The frontend is a single `index.html` file. Replace the hardcoded `USERS` object and DOM mutations with `fetch()` calls.

**1. Login:**
```javascript
async function doLogin() {
  const res  = await fetch('http://localhost:3000/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('waresys_token', data.token);
    // mount the app...
  }
}
```

**2. Auth header (all protected requests):**
```javascript
const authHeaders = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${localStorage.getItem('waresys_token')}`
};
```

**3. Load inventory:**
```javascript
const res  = await fetch('/api/inventory?status=LOW', { headers: authHeaders });
const data = await res.json();
// data.data = array of inventory items
```

---

## 🌱 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@waresys.com` | `admin123` |
| Staff | `staff@waresys.com` | `staff123` |
| Viewer | `view@waresys.com` | `view123` |

> ⚠️ Change these credentials before deploying to production.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4.x |
| Database | MongoDB + Mongoose 8.x |
| Auth | JWT + bcryptjs |
| Dev Server | Nodemon |

---

## 📄 License

MIT © 2025 — Advaitya WareSys