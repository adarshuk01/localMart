const multer     = require('multer')
const cloudinary = require('cloudinary').v2
const sharp      = require('sharp')
const { AppError } = require('./AppError')

// ── Cloudinary config ─────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Multer — memory storage only (no disk writes) ─────────
const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  const allowed = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',')
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new AppError(`File type not allowed. Allowed: ${allowed.join(', ')}`, 400), false)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
})

// ── Upload buffer to Cloudinary ───────────────────────────
const uploadToCloudinary = (buffer, folder, publicId, { width, height, quality = 80 } = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:     publicId,
        overwrite:     true,
        resource_type: 'image',
        transformation: [
          { width, height, crop: 'fill', gravity: 'center', quality, fetch_format: 'webp' },
        ],
      },
      (error, result) => {
        if (error) return reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500))
        resolve(result.secure_url)
      }
    )

    // Convert to webp with sharp, then stream to Cloudinary
    sharp(buffer)
      .webp({ quality })
      .toBuffer()
      .then(webpBuffer => {
        const { Readable } = require('stream')
        const readable = new Readable()
        readable.push(webpBuffer)
        readable.push(null)
        readable.pipe(uploadStream)
      })
      .catch(reject)
  })
}

// ── Delete image from Cloudinary by URL ───────────────────
const deleteImage = async (url) => {
  if (!url) return
  try {
    // Extract public_id from Cloudinary URL
    // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/shops/shop-abc.webp
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/)
    if (matches && matches[1]) {
      await cloudinary.uploader.destroy(matches[1])
    }
  } catch (err) {
    console.error('Cloudinary delete error:', err.message)
  }
}

// ── Preset processors (drop-in replacements) ─────────────
const shopImageProcessor    = (buffer, id) =>
  uploadToCloudinary(buffer, 'shops',    `shop-${id}`,    { width: 1200, height: 600 })

const productImageProcessor = (buffer, id) =>
  uploadToCloudinary(buffer, 'products', `product-${id}`, { width: 600,  height: 600 })

const avatarImageProcessor  = (buffer, id) =>
  uploadToCloudinary(buffer, 'avatars',  `avatar-${id}`,  { width: 200,  height: 200 })

module.exports = {
  upload,
  uploadToCloudinary,
  deleteImage,
  shopImageProcessor,
  productImageProcessor,
  avatarImageProcessor,
}
