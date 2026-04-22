const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    shopId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Shop',
      required: [true, 'Shop ID is required'],
    },

    name: {
      type:     String,
      required: [true, 'Product name is required'],
      trim:     true,
      maxlength:[150, 'Product name cannot exceed 150 characters'],
    },

    description: {
      type:     String,
      trim:     true,
      maxlength:[500],
    },

    category: {
      type:     String,
      required: [true, 'Category is required'],
      trim:     true,
    },

    // ── Pricing ───────────────────────────────────────────
    price: {
      type:     Number,
      required: [true, 'Price is required'],
      min:      [0, 'Price cannot be negative'],
    },
    mrp: {
      type:     Number,
      validate: {
        validator: function (v) { return !v || v >= this.price },
        message:  'MRP cannot be less than selling price',
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: 0, max: 100,
    },

    unit: {
      type:     String,
      required: [true, 'Unit is required'],
      trim:     true,
    },

    // ── Stock ─────────────────────────────────────────────
    stock: {
      type:     Number,
      required: [true, 'Stock quantity is required'],
      min:      [0, 'Stock cannot be negative'],
      default:  0,
    },
    lowStockThreshold: { type: Number, default: 10 },
    trackInventory:    { type: Boolean, default: true },

    // ── Media ─────────────────────────────────────────────
    image:  { type: String },
    images: [{ type: String }],

    // ── Meta ──────────────────────────────────────────────
    tags:       [{ type: String, lowercase: true }],
    barcode:    { type: String },
    sku:        { type: String },

    isActive:    { type: Boolean, default: true  },
    isFeatured:  { type: Boolean, default: false },

    sortOrder:   { type: Number, default: 0 },

    // ── Aggregated ratings ────────────────────────────────
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount:   { type: Number, default: 0 },
    totalSold:      { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ────────────────────────────────────────────────
productSchema.index({ shopId: 1, isActive: 1 })
productSchema.index({ shopId: 1, category: 1 })
productSchema.index({ name: 'text', description: 'text', tags: 'text' })

// ── Virtual: discount percentage ──────────────────────────
productSchema.virtual('discountPct').get(function () {
  if (!this.mrp || this.mrp <= this.price) return 0
  return Math.round((1 - this.price / this.mrp) * 100)
})

// ── Virtual: isLowStock ───────────────────────────────────
productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.lowStockThreshold
})

// ── Virtual: isOutOfStock ─────────────────────────────────
productSchema.virtual('isOutOfStock').get(function () {
  return this.stock === 0
})

// ── Pre save: auto-calculate discount ─────────────────────
productSchema.pre('save', function (next) {
  if (this.mrp && this.price && this.mrp > this.price) {
    this.discount = Math.round((1 - this.price / this.mrp) * 100)
  }
  next()
})

module.exports = mongoose.model('Product', productSchema)
