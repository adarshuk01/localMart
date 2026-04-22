# 🛒 LocalMart v2 — Integrated Frontend

Full-stack integrated React + Vite frontend for LocalMart, wired to the Node.js/Express/MongoDB backend.

---

## ✨ What's New in v2

- **Real API integration** — all pages use live backend data via Axios
- **Loading states** — skeleton loaders on every data-heavy page
- **Error handling** — global error alerts with retry, 401 auto-redirect
- **Mobile-first** — User module is a PWA-style mobile app; Admin/Shop use responsive sidebar with hamburger menu
- **New pages added**: Register, ShopApply/Profile with GPS + map preview, Shop Reviews, Delivery Earnings, Admin Pending Shops
- **Pagination** — all list pages paginated
- **Search & Filter** — debounced search on shops, products, users
- **Cart** — synced with backend, mixed-shop guard
- **Order tracking** — 5-step visual progress bar
- **Notifications** — real-time badge count from API

---

## 🗂️ Folder Structure

```
src/
├── assets/            Static assets + animation CSS
├── components/
│   └── common/        Avatar, Spinner, Modal, StatCard, DataTable, Toggle, Pagination…
│       ├── index.jsx  All common exports
│       ├── Sidebar.jsx   Desktop + mobile drawer
│       └── Topbar.jsx    Notification bell + avatar
├── context/
│   ├── AuthContext.jsx   JWT restore, login, logout, updateUser
│   └── CartContext.jsx   Cart synced with backend
├── hooks/
│   └── index.js       useAsync, useDebounce, useGeolocation, useToggle, usePagination
├── layouts/
│   └── index.jsx      AdminLayout, ShopkeeperLayout, DeliveryLayout, UserLayout
├── pages/
│   ├── auth/          LoginPage, RegisterPage
│   ├── admin/         Dashboard, Shops, ShopDetail, Users, Analytics, Settings
│   ├── shopkeeper/    Dashboard, ShopApply/Profile, Products, Orders, Team, Analytics, Reviews
│   ├── delivery/      Dashboard, Orders, History, Earnings
│   └── user/          Home, ShopDetail, Cart, Orders, Map, Profile
├── services/
│   └── api.js         Axios instance + all API endpoints (authAPI, adminAPI, shopkeeperAPI, deliveryAPI, userAPI)
├── App.jsx            Role-guarded routes
└── main.jsx           Entry point
```

---

## 🚀 Quick Start

### 1. Start the backend first
```bash
cd localmart-backend
npm run seed   # seed demo data
npm run dev    # → http://localhost:5000
```

### 2. Start the frontend
```bash
cd localmart-v2
cp .env.example .env
npm install
npm run dev    # → http://localhost:5173
```

> The Vite dev server proxies `/api` → `http://localhost:5000` automatically.

---

## 🔑 Demo Logins

| Role        | Email                       | Password       |
|-------------|----------------------------|----------------|
| Admin       | admin@localmart.in         | Admin@123      |
| Shopkeeper  | shop@greenleaf.in          | Shop@1234      |
| Delivery    | delivery@greenleaf.in      | Delivery@123   |
| User        | user@example.com           | User@1234      |

Or click the **Quick Demo Login** buttons on the login page.

---

## 📱 Mobile Responsive Design

| Module       | Approach                                      |
|--------------|-----------------------------------------------|
| Auth         | Stacked layout on mobile, side panel on desktop|
| Admin        | Collapsible sidebar via hamburger menu         |
| Shopkeeper   | Collapsible sidebar, touch-friendly cards      |
| Delivery     | Full mobile layout, one-tap delivery confirm   |
| User         | Mobile-first PWA with bottom navigation        |

---

## 🔌 API Integration Map

| Page                  | API Call                                    |
|-----------------------|---------------------------------------------|
| Login                 | `authAPI.login()`                           |
| Register              | `authAPI.register()`                        |
| Admin Dashboard       | `adminAPI.dashboard()`                      |
| Admin Analytics       | `adminAPI.analytics()`                      |
| Admin Shops           | `adminAPI.shops()` + approve/reject         |
| Admin Users           | `adminAPI.users()` + suspend                |
| Shop Dashboard        | `shopkeeperAPI.dashboard()`                 |
| Shop Apply/Profile    | `shopkeeperAPI.createShop()` / `updateShop()`|
| Products              | `shopkeeperAPI.products()` + CRUD           |
| Shop Orders           | `shopkeeperAPI.orders()` + updateOrder      |
| Team                  | `shopkeeperAPI.team()` + addMember/remove   |
| Shop Analytics        | `shopkeeperAPI.analytics()`                 |
| Delivery Dashboard    | `deliveryAPI.dashboard()`                   |
| Delivery Earnings     | `deliveryAPI.earnings()`                    |
| User Home             | `userAPI.nearbyShops()` with GPS coords     |
| Shop Detail           | `userAPI.shopById()` + shopReviews          |
| Cart                  | `userAPI.cart()` + addToCart + updateCart   |
| Place Order           | `userAPI.placeOrder()`                      |
| My Orders             | `userAPI.myOrders()`                        |
| Map                   | `userAPI.nearbyShops()` + OSM iframe        |
| Notifications         | `userAPI.notifications()` + markRead        |

---

## 🧰 Tech Stack

| Package          | Version | Purpose                  |
|------------------|---------|--------------------------|
| React            | 18      | UI framework             |
| Vite             | 5       | Build tool               |
| Tailwind CSS     | 3       | Utility styling          |
| React Router     | 6       | Client routing           |
| Axios            | 1.6     | HTTP client              |
| Chart.js         | 4       | Revenue/analytics charts |
| react-hot-toast  | 2       | Toast notifications      |
| OpenStreetMap    | —       | Embedded maps (no key)   |
| Sora + DM Sans   | —       | Typography               |
| react-icons (Tb) | 5       | Tabler icon set          |
