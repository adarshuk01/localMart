require('dotenv').config()
const mongoose  = require('mongoose')
const bcrypt    = require('bcryptjs')
const User      = require('../models/User')
const Shop      = require('../models/Shop')
const Product   = require('../models/Product')
const Order     = require('../models/Order')
const Review    = require('../models/Review')
const { Cart, Notification } = require('../models/Cart')
const logger    = require('./logger')

// ── Seed data ─────────────────────────────────────────────

const HASH = (pw) => bcrypt.hashSync(pw, 10)

const USERS = [
  { name: 'Arjun Nair',   email: 'admin@localmart.in',    password: 'Admin@123',    role: 'admin'      },
  { name: 'Priya Menon',  email: 'shop@greenleaf.in',     password: HASH('Shop@1234'),    role: 'shopkeeper' },
  { name: 'Suresh Babu',  email: 'shop2@salon.in',        password: HASH('Shop@1234'),    role: 'shopkeeper' },
  { name: 'Meera Pillai', email: 'user@example.com',      password: HASH('User@1234'),    role: 'user'       },
  { name: 'Kavya Sharma', email: 'user2@example.com',     password: HASH('User@1234'),    role: 'user'       },
]

const SHOPS = (owners) => [
  {
    name:        'Green Leaf Grocery',
    description: 'Fresh vegetables, fruits and daily groceries from local farmers.',
    category:    'grocery',
    ownerId:     owners[0]._id,
    status:      'approved',
    approvedAt:  new Date(),
    address:     { full: '12, MG Road, Palakkad, Kerala 678001' },
    location:    { type: 'Point', coordinates: [76.6548, 10.7867] },
    phone:       '+91 9876543211',
    email:       'shop@greenleaf.in',
    deliveryRadius:   5,
    deliveryFee:      30,
    freeDeliveryAbove:500,
    minOrderAmount:   100,
    ratingsAverage:   4.7,
    ratingsCount:     128,
    isOpen:      true,
    isVerified:  true,
  },
  {
    name:        'Style Studio Salon',
    description: 'Premium salon services — haircut, styling, spa and more.',
    category:    'salon',
    ownerId:     owners[1]._id,
    status:      'approved',
    approvedAt:  new Date(),
    address:     { full: '45, Coimbatore Road, Palakkad, Kerala 678002' },
    location:    { type: 'Point', coordinates: [76.6598, 10.7920] },
    phone:       '+91 9876543214',
    email:       'shop2@salon.in',
    deliveryEnabled:  false,
    deliveryRadius:   0,
    deliveryFee:      0,
    minOrderAmount:   0,
    ratingsAverage:   4.5,
    ratingsCount:     89,
    isOpen:      true,
    isVerified:  true,
  },
  {
    name:        'MediCare Pharmacy',
    description: '24/7 pharmacy with all medicines and health products.',
    category:    'pharmacy',
    ownerId:     owners[0]._id,
    status:      'pending',
    address:     { full: '78, Fort Road, Palakkad, Kerala 678003' },
    location:    { type: 'Point', coordinates: [76.6520, 10.7850] },
    phone:       '+91 9876543215',
    email:       'medicare@pharmacy.in',
    deliveryRadius:   3,
    deliveryFee:      20,
    minOrderAmount:   50,
    isOpen:      true,
  },
]

const PRODUCTS = (shopId) => [
  { shopId, name: 'Organic Tomatoes',  category: 'Vegetables', price: 45,  mrp: 60,  unit: '500g',    stock: 120, isActive: true  },
  { shopId, name: 'Basmati Rice',      category: 'Grains',     price: 85,  mrp: 95,  unit: '1kg',     stock: 80,  isActive: true  },
  { shopId, name: 'Fresh Milk',        category: 'Dairy',      price: 28,  mrp: 30,  unit: '500ml',   stock: 50,  isActive: true  },
  { shopId, name: 'Whole Wheat Bread', category: 'Bakery',     price: 40,  mrp: 45,  unit: '400g',    stock: 30,  isActive: true  },
  { shopId, name: 'Yellow Dal',        category: 'Pulses',     price: 110, mrp: 130, unit: '1kg',     stock: 60,  isActive: false },
  { shopId, name: 'Coconut Oil',       category: 'Oils',       price: 180, mrp: 210, unit: '1L',      stock: 40,  isActive: true  },
  { shopId, name: 'Fresh Eggs',        category: 'Dairy',      price: 72,  mrp: 80,  unit: '6 pcs',   stock: 100, isActive: true  },
  { shopId, name: 'Green Spinach',     category: 'Vegetables', price: 20,  mrp: 25,  unit: '250g',    stock: 8,   isActive: true, lowStockThreshold: 10 },
]

const SALON_PRODUCTS = (shopId) => [
  { shopId, name: 'Haircut (Men)',  category: 'Hair', price: 150, mrp: 200, unit: 'session', stock: 99, isActive: true },
  { shopId, name: 'Hair Colour',   category: 'Hair', price: 800, mrp: 1000,unit: 'session', stock: 99, isActive: true },
  { shopId, name: 'Facial',        category: 'Skin', price: 600, mrp: 750, unit: 'session', stock: 99, isActive: true },
]

const SUB_USERS = (shopId) => [
  { name: 'Ravi Kumar', email: 'delivery@greenleaf.in', password: HASH('Delivery@123'), role: 'delivery', shopId },
  { name: 'Anand Raj',  email: 'stock@greenleaf.in',    password: HASH('Stock@1234'),   role: 'stock',    shopId },
]

// ── Seed ──────────────────────────────────────────────────
const seed = async () => {
  const clear = process.argv.includes('--clear')

  try {
    await mongoose.connect(process.env.MONGO_URI)
    logger.info('Connected to MongoDB for seeding.')

    if (clear) {
      logger.warn('Clearing all collections…')
      await Promise.all([
        User.deleteMany(), Shop.deleteMany(), Product.deleteMany(),
        Order.deleteMany(), Review.deleteMany(), Cart.deleteMany(), Notification.deleteMany(),
      ])
      logger.info('All collections cleared.')
      if (process.argv.includes('--clear') && !process.argv.includes('--seed')) {
        process.exit(0)
      }
    }

    // ── Users ──────────────────────────────────────────────
    logger.info('Seeding users…')
    const createdUsers = []
    for (const u of USERS) {
      const exists = await User.findOne({ email: u.email })
      if (!exists) {
        const user = new User(u)
        user.password = u.password  // already hashed, set directly
        await user.save({ validateBeforeSave: false })
        createdUsers.push(user)
      } else {
        createdUsers.push(exists)
      }
    }

    const shopkeepers = createdUsers.filter(u => u.role === 'shopkeeper')
    const users       = createdUsers.filter(u => u.role === 'user')

    // ── Shops ──────────────────────────────────────────────
    logger.info('Seeding shops…')
    const shopData = SHOPS(shopkeepers)
    const createdShops = []
    for (const s of shopData) {
      const exists = await Shop.findOne({ name: s.name })
      if (!exists) {
        const shop = await Shop.create(s)
        createdShops.push(shop)
      } else {
        createdShops.push(exists)
      }
    }

    const groceryShop = createdShops[0]
    const salonShop   = createdShops[1]

    // ── Sub users ──────────────────────────────────────────
    logger.info('Seeding sub-users…')
    for (const su of SUB_USERS(groceryShop._id)) {
      const exists = await User.findOne({ email: su.email })
      if (!exists) {
        const subUser = new User(su)
        subUser.password = su.password
        await subUser.save({ validateBeforeSave: false })
      }
    }

    // ── Products ───────────────────────────────────────────
    logger.info('Seeding products…')
    const existingGrocery = await Product.countDocuments({ shopId: groceryShop._id })
    if (!existingGrocery) await Product.insertMany(PRODUCTS(groceryShop._id))

    const existingSalon = await Product.countDocuments({ shopId: salonShop._id })
    if (!existingSalon) await Product.insertMany(SALON_PRODUCTS(salonShop._id))

    // ── Reviews ────────────────────────────────────────────
    logger.info('Seeding reviews…')
    const reviewData = [
      { shopId: groceryShop._id, userId: users[0]._id, rating: 5, comment: 'Super fresh veggies! Delivered on time.' },
      { shopId: groceryShop._id, userId: users[1]?._id || users[0]._id, rating: 4, comment: 'Good quality, will order again.' },
      { shopId: salonShop._id,   userId: users[0]._id, rating: 5, comment: 'Amazing haircut, very professional!' },
    ]
    for (const r of reviewData) {
      const exists = await Review.findOne({ shopId: r.shopId, userId: r.userId })
      if (!exists) await Review.create(r)
    }

    logger.info('✅ Seeding complete!')
    logger.info('')
    logger.info('── Demo Accounts ──────────────────────────')
    logger.info('Admin:       admin@localmart.in  / Admin@123')
    logger.info('Shopkeeper:  shop@greenleaf.in   / Shop@1234')
    logger.info('Salon:       shop2@salon.in      / Shop@1234')
    logger.info('Delivery:    delivery@greenleaf.in / Delivery@123')
    logger.info('User:        user@example.com    / User@1234')
    logger.info('───────────────────────────────────────────')

    process.exit(0)
  } catch (err) {
    logger.error('Seeding failed:', err)
    process.exit(1)
  }
}

seed()
