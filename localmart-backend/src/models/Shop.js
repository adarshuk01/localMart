const mongoose = require('mongoose')
const slugify  = require('slugify')

const SHOP_CATEGORIES = [
  'grocery', 'salon', 'pharmacy', 'bakery', 'restaurant',
  'electronics', 'clothing', 'hardware', 'stationery', 'other',
]

const SHOP_STATUSES = ['pending', 'approved', 'rejected', 'suspended']

const businessHoursSchema = new mongoose.Schema({
  open:   { type: String, default: '09:00' },
  close:  { type: String, default: '21:00' },
  closed: { type: Boolean, default: false  },
}, { _id: false })

const shopSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Shop name is required'],
      trim:     true,
      maxlength:[100, 'Shop name cannot exceed 100 characters'],
    },

    slug: { type: String, unique: true },

    description: {
      type:     String,
      trim:     true,
      maxlength:[500, 'Description cannot exceed 500 characters'],
    },

    category: {
      type:     String,
      required: [true, 'Category is required'],
      enum:     SHOP_CATEGORIES,
    },

    // ── Owner & team ──────────────────────────────────────
    ownerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Owner is required'],
    },

    // ── Location ──────────────────────────────────────────
    address: {
      street:  String,
      city:    String,
      state:   String,
      pincode: String,
      full:    { type: String, trim: true },
    },

    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type:     [Number],   // [longitude, latitude]
        required: [true, 'Coordinates are required'],
        validate: {
          validator: (v) => v.length === 2 && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90,
          message:  'Invalid coordinates [lng, lat]',
        },
      },
    },

    // ── Contact ───────────────────────────────────────────
    phone:  { type: String, trim: true },
    email:  { type: String, lowercase: true, trim: true },
    website:{ type: String },

    // ── Media ─────────────────────────────────────────────
    coverImage:  { type: String },
    images:      [{ type: String }],

    // ── Business hours (per day) ──────────────────────────
    businessHours: {
      monday:    { type: businessHoursSchema, default: {} },
      tuesday:   { type: businessHoursSchema, default: {} },
      wednesday: { type: businessHoursSchema, default: {} },
      thursday:  { type: businessHoursSchema, default: {} },
      friday:    { type: businessHoursSchema, default: {} },
      saturday:  { type: businessHoursSchema, default: {} },
      sunday:    { type: businessHoursSchema, default: { closed: true } },
    },

    // ── Delivery settings ─────────────────────────────────
    deliveryEnabled:  { type: Boolean, default: true  },
    deliveryRadius:   { type: Number,  default: 5      },  // km
    deliveryFee:      { type: Number,  default: 30     },
    freeDeliveryAbove:{ type: Number,  default: 500    },
    minOrderAmount:   { type: Number,  default: 100    },
    avgDeliveryTime:  { type: Number,  default: 30     },  // minutes

    // ── Status ────────────────────────────────────────────
    status: {
      type:    String,
      enum:    SHOP_STATUSES,
      default: 'pending',
    },
    rejectionReason: { type: String },
    approvedAt:      { type: Date   },
    approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Documents (FSSAI, GST etc.) ───────────────────────
    documents: [
      {
        type:   { type: String },
        number: { type: String },
        url:    { type: String },
      },
    ],

    // ── Ratings ───────────────────────────────────────────
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5, set: v => Math.round(v * 10) / 10 },
    ratingsCount:   { type: Number, default: 0 },

    // ── Flags ─────────────────────────────────────────────
    isOpen:      { type: Boolean, default: true  },
    isFeatured:  { type: Boolean, default: false },
    isVerified:  { type: Boolean, default: false },

    tags: [{ type: String, lowercase: true }],

    totalOrders:  { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ────────────────────────────────────────────────
shopSchema.index({ location: '2dsphere' })
shopSchema.index({ status: 1, category: 1 })
shopSchema.index({ ownerId: 1 })
shopSchema.index({ slug: 1 })
shopSchema.index({ name: 'text', description: 'text', tags: 'text' })

// ── Slugify name ───────────────────────────────────────────
shopSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now()
  }
  next()
})

// ── Virtual: coordinate array [lat, lng] ──────────────────
shopSchema.virtual('latLng').get(function () {
  if (!this.location?.coordinates) return null
  return { lat: this.location.coordinates[1], lng: this.location.coordinates[0] }
})

// ── Virtual: products ─────────────────────────────────────
shopSchema.virtual('products', {
  ref:          'Product',
  localField:   '_id',
  foreignField: 'shopId',
})

// ── Static: update rating ──────────────────────────────────
shopSchema.statics.updateRatings = async function (shopId) {
  const Review = require('./Review')
  const stats  = await Review.aggregate([
    { $match: { shopId: mongoose.Types.ObjectId(shopId) } },
    { $group: { _id: '$shopId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  if (stats.length > 0) {
    await this.findByIdAndUpdate(shopId, {
      ratingsAverage: stats[0].avg,
      ratingsCount:   stats[0].count,
    })
  }
}

module.exports = mongoose.model('Shop', shopSchema)
