const multer = require('multer')
const sharp  = require('sharp')
const path   = require('path')
const fs     = require('fs')
const { AppError } = require('./AppError')

// ── Ensure upload dirs exist ───────────────────────────────
const UPLOAD_BASE = path.join(__dirname, '..', 'uploads')
const DIRS = ['shops', 'products', 'avatars']
DIRS.forEach(d => {
  const p = path.join(UPLOAD_BASE, d)
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
})

// ── Multer memory storage ──────────────────────────────────
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

// ── Process + save image ───────────────────────────────────
const processImage = async (buffer, folder, filename, { width = 800, height = 600, quality = 80 } = {}) => {
  const outputPath = path.join(UPLOAD_BASE, folder, filename)
  await sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality })
    .toFile(outputPath)
  return `/uploads/${folder}/${filename}`
}

// ── Delete image ───────────────────────────────────────────
const deleteImage = (url) => {
  if (!url) return
  const filePath = path.join(__dirname, '..', url.replace('/uploads', 'uploads'))
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

// ── Preset processors ──────────────────────────────────────
const shopImageProcessor    = (buffer, id) => processImage(buffer, 'shops',    `shop-${id}-${Date.now()}.webp`,    { width: 1200, height: 600 })
const productImageProcessor = (buffer, id) => processImage(buffer, 'products', `product-${id}-${Date.now()}.webp`, { width: 600,  height: 600 })
const avatarImageProcessor  = (buffer, id) => processImage(buffer, 'avatars',  `avatar-${id}-${Date.now()}.webp`,  { width: 200,  height: 200 })

module.exports = {
  upload,
  processImage,
  deleteImage,
  shopImageProcessor,
  productImageProcessor,
  avatarImageProcessor,
}
