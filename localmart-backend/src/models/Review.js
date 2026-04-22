const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    shopId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Shop',
      required: [true, 'Shop is required'],
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User is required'],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Order',
    },
    rating: {
      type:     Number,
      required: [true, 'Rating is required'],
      min: 1, max: 5,
    },
    comment: {
      type:     String,
      maxlength:[500, 'Review cannot exceed 500 characters'],
      trim:     true,
    },
    images:   [{ type: String }],
    isVerified: { type: Boolean, default: false },
    isHidden:   { type: Boolean, default: false },

    // Shop reply
    reply: {
      text: String,
      at:   Date,
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Each user can review a shop only once ──────────────────
reviewSchema.index({ shopId: 1, userId: 1 }, { unique: true })

// ── Recalculate shop ratings after save/delete ─────────────
const updateShopRating = async (shopId) => {
  const Shop = require('./Shop')
  const stats = await mongoose.model('Review').aggregate([
    { $match: { shopId, isHidden: false } },
    { $group: { _id: '$shopId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  if (stats.length > 0) {
    await Shop.findByIdAndUpdate(shopId, {
      ratingsAverage: stats[0].avg,
      ratingsCount:   stats[0].count,
    })
  } else {
    await Shop.findByIdAndUpdate(shopId, { ratingsAverage: 0, ratingsCount: 0 })
  }
}

reviewSchema.post('save',            function () { updateShopRating(this.shopId) })
reviewSchema.post('findOneAndDelete',function (doc) { if (doc) updateShopRating(doc.shopId) })

module.exports = mongoose.model('Review', reviewSchema)
