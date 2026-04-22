# 🛒 LocalMart Backend API

Production-grade REST API for the LocalMart hyperlocal e-commerce platform — built with **Node.js**, **Express** and **MongoDB**.

---

## ✨ Feature Highlights

- **4-role auth system** — Admin, Shopkeeper, Delivery, User
- **JWT + HttpOnly cookie** authentication with refresh support
- **Role-based access control** (RBAC) via middleware
- **GeoJSON + 2dsphere index** for nearest-shop discovery
- **Image upload + processing** (Multer + Sharp → WebP conversion)
- **Chainable query API** — filter, search, sort, paginate on every list endpoint
- **Auto order number** generation (`LM-000001`)
- **Delivery OTP** for confirmed handoffs
- **Stock deduction** on order confirmation with rollback on cancel
- **Review system** auto-updates shop rating via Mongoose hooks
- **Winston** structured logging with daily rotating files
- **Rate limiting** (global, auth, upload) via `express-rate-limit`
- **Helmet, HPP, XSS-Clean, Mongo-Sanitize** security layers
- **Graceful shutdown** on SIGTERM/SIGINT

---

## 🗂️ Folder Structure

```
localmart-backend/
├── logs/                          # Auto-created rotating log files
├── src/
│   ├── app.js                     # Express setup (middleware stack)
│   ├── server.js                  # Boot, DB connect, graceful shutdown
│   ├── config/
│   │   └── database.js            # Mongoose connection
│   ├── controllers/
│   │   ├── auth/
│   │   │   └── authController.js  # register, login, logout, me, updateProfile
│   │   ├── admin/
│   │   │   └── adminController.js # dashboard, shops, users, analytics
│   │   ├── shopkeeper/
│   │   │   └── shopkeeperController.js # shop CRUD, products, orders, team
│   │   ├── delivery/
│   │   │   └── deliveryController.js   # active orders, mark delivered, earnings
│   │   └── user/
│   │       └── userController.js  # discovery, cart, orders, reviews, notifications
│   ├── middleware/
│   │   ├── auth.js                # protect, restrictTo, shopOwner, shopMember
│   │   ├── errorHandler.js        # global error handler (Mongoose, JWT, Multer)
│   │   └── rateLimiter.js         # apiLimiter, authLimiter, uploadLimiter
│   ├── models/
│   │   ├── User.js                # bcrypt, 2dsphere, role enum
│   │   ├── Shop.js                # GeoJSON Point, slugify, text index
│   │   ├── Product.js             # stock, discount virtual, lowStock virtual
│   │   ├── Order.js               # status history, OTP, auto order number
│   │   ├── Review.js              # auto-updates shop rating
│   │   └── Cart.js                # Cart + Notification models
│   ├── routes/
│   │   ├── index.js               # master router + health check
│   │   ├── auth/authRoutes.js
│   │   ├── admin/adminRoutes.js
│   │   ├── shopkeeper/shopkeeperRoutes.js
│   │   ├── delivery/deliveryRoutes.js
│   │   └── user/userRoutes.js
│   ├── uploads/
│   │   ├── shops/                 # Shop cover images (WebP)
│   │   ├── products/              # Product images (WebP)
│   │   └── avatars/               # User avatars (WebP)
│   └── utils/
│       ├── AppError.js            # AppError class, asyncHandler, sendSuccess
│       ├── APIFeatures.js         # filter, search, sort, paginate
│       ├── jwtUtils.js            # signToken, verifyToken, sendTokenResponse
│       ├── fileUpload.js          # Multer + Sharp processors
│       ├── geoUtils.js            # Haversine, $geoWithin, $near
│       ├── logger.js              # Winston + daily rotate
│       └── seeder.js              # Database seeder
└── .env.example
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET
```

### 3. Seed the database
```bash
npm run seed
# Clear and re-seed:
npm run seed:clear && npm run seed
```

### 4. Start development server
```bash
npm run dev
```

Open: `http://localhost:5000/api/v1/health`

---

## 🔑 Demo Credentials

| Role        | Email                       | Password       |
|-------------|----------------------------|----------------|
| Admin       | admin@localmart.in         | Admin@123      |
| Shopkeeper  | shop@greenleaf.in          | Shop@1234      |
| Salon Owner | shop2@salon.in             | Shop@1234      |
| Delivery    | delivery@greenleaf.in      | Delivery@123   |
| User        | user@example.com           | User@1234      |

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`

### Auth
| Method | Route                        | Auth     | Description          |
|--------|------------------------------|----------|----------------------|
| POST   | `/auth/register`             | —        | Register new user    |
| POST   | `/auth/login`                | —        | Login                |
| POST   | `/auth/logout`               | —        | Logout               |
| GET    | `/auth/me`                   | ✅       | Get current user     |
| PUT    | `/auth/update-profile`       | ✅       | Update profile       |
| PUT    | `/auth/change-password`      | ✅       | Change password      |

### Admin (`role: admin`)
| Method | Route                        | Description              |
|--------|------------------------------|--------------------------|
| GET    | `/admin/dashboard`           | Platform overview KPIs   |
| GET    | `/admin/analytics`           | Revenue, user growth      |
| GET    | `/admin/shops`               | List all shops            |
| GET    | `/admin/shops/:id`           | Shop detail + products    |
| POST   | `/admin/shops/:id/approve`   | Approve shop application  |
| POST   | `/admin/shops/:id/reject`    | Reject with reason        |
| POST   | `/admin/shops/:id/suspend`   | Suspend shop              |
| DELETE | `/admin/shops/:id`           | Delete shop + data        |
| GET    | `/admin/users`               | List all users            |
| PUT    | `/admin/users/:id`           | Update user / role        |
| POST   | `/admin/users/:id/suspend`   | Suspend user              |
| DELETE | `/admin/users/:id`           | Delete user               |

### Shopkeeper (`role: shopkeeper`)
| Method | Route                            | Description              |
|--------|----------------------------------|--------------------------|
| GET    | `/shopkeeper/shop`               | Get my shop              |
| POST   | `/shopkeeper/shop`               | Register shop (with map) |
| PUT    | `/shopkeeper/shop`               | Update shop              |
| GET    | `/shopkeeper/shop/dashboard`     | KPIs + recent orders     |
| GET    | `/shopkeeper/shop/analytics`     | Revenue charts           |
| GET    | `/shopkeeper/products`           | List products            |
| GET    | `/shopkeeper/products/low-stock` | Low stock alerts         |
| POST   | `/shopkeeper/products`           | Add product              |
| PUT    | `/shopkeeper/products/:id`       | Edit product             |
| DELETE | `/shopkeeper/products/:id`       | Delete product           |
| POST   | `/shopkeeper/products/:id/toggle`| Toggle active/inactive   |
| GET    | `/shopkeeper/orders`             | All shop orders          |
| PUT    | `/shopkeeper/orders/:id/status`  | Advance order status     |
| PUT    | `/shopkeeper/orders/:id/assign`  | Assign delivery person   |
| GET    | `/shopkeeper/team`               | List team members        |
| POST   | `/shopkeeper/team`               | Add sub-user             |
| PUT    | `/shopkeeper/team/:id`           | Update team member       |
| DELETE | `/shopkeeper/team/:id`           | Remove team member       |

### Delivery (`role: delivery`)
| Method | Route                            | Description              |
|--------|----------------------------------|--------------------------|
| GET    | `/delivery/dashboard`            | Stats + active orders    |
| GET    | `/delivery/orders`               | Active assigned orders   |
| GET    | `/delivery/history`              | Delivered orders          |
| GET    | `/delivery/earnings`             | Earnings by month        |
| POST   | `/delivery/orders/:id/delivered` | Mark order delivered     |

### User
| Method | Route                         | Auth  | Description              |
|--------|-------------------------------|-------|--------------------------|
| GET    | `/user/shops/nearby`          | opt   | Nearest shops (lat, lng) |
| GET    | `/user/shops/search?q=`       | opt   | Text search shops        |
| GET    | `/user/shops/category/:cat`   | opt   | Shops by category        |
| GET    | `/user/shops/:id`             | opt   | Shop + products          |
| GET    | `/user/shops/:id/reviews`     | opt   | Shop reviews             |
| GET    | `/user/cart`                  | ✅   | Get cart                 |
| POST   | `/user/cart`                  | ✅   | Add to cart              |
| PUT    | `/user/cart`                  | ✅   | Update qty / remove      |
| DELETE | `/user/cart`                  | ✅   | Clear cart               |
| POST   | `/user/orders`                | ✅   | Place order              |
| GET    | `/user/orders`                | ✅   | My orders                |
| GET    | `/user/orders/:id`            | ✅   | Order detail             |
| POST   | `/user/orders/:id/cancel`     | ✅   | Cancel order             |
| POST   | `/user/reviews`               | ✅   | Submit review            |
| GET    | `/user/notifications`         | ✅   | My notifications         |
| POST   | `/user/notifications/read`    | ✅   | Mark all read            |

---

## ⚙️ Query Parameters

All list endpoints support:

| Param    | Example                       | Description            |
|----------|-------------------------------|------------------------|
| `search` | `?search=rice`                | Text search            |
| `sort`   | `?sort=-createdAt,price`      | Sort fields            |
| `fields` | `?fields=name,price,stock`    | Select specific fields |
| `page`   | `?page=2`                     | Pagination             |
| `limit`  | `?limit=20`                   | Items per page (max 100)|
| `status` | `?status=approved`            | Filter by status       |
| `category`| `?category=grocery`          | Filter by category     |

Nearby shop endpoint also accepts: `lat`, `lng`, `radius` (km), `sort` (distance\|rating)

---

## 🔐 Security Stack

- **Helmet** — HTTP security headers
- **CORS** — restricted to `CLIENT_URL`
- **express-rate-limit** — per window limits (global, auth, upload)
- **express-mongo-sanitize** — NoSQL injection prevention
- **xss-clean** — XSS sanitisation
- **hpp** — HTTP parameter pollution prevention
- **bcryptjs** — Password hashing (12 rounds)
- **JWT** — stateless auth via Bearer token + HttpOnly cookie
- **Multer + Sharp** — file type validation + conversion to WebP

---

## 🧰 Tech Stack

| Package                  | Role                          |
|--------------------------|-------------------------------|
| express                  | HTTP framework                |
| mongoose                 | MongoDB ODM                   |
| bcryptjs                 | Password hashing              |
| jsonwebtoken             | JWT tokens                    |
| multer + sharp           | File upload + image processing|
| winston + daily-rotate   | Structured logging            |
| express-rate-limit       | Rate limiting                 |
| helmet / hpp / xss-clean | Security hardening            |
| slugify                  | URL-safe shop slugs           |
| compression              | Gzip response compression     |
| nodemon                  | Dev hot reload                |
