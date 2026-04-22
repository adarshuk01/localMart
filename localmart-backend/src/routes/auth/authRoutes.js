const router      = require('express').Router()
const ctrl        = require('../../controllers/auth/authController')
const { protect } = require('../../middleware/auth')
const { authLimiter } = require('../../middleware/rateLimiter')
const { upload }  = require('../../utils/fileUpload')

// ── Public ────────────────────────────────────────────────
router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.post('/logout',               ctrl.logout)

// ── Protected ─────────────────────────────────────────────
router.get ('/me',              protect, ctrl.getMe)
router.put ('/update-profile',  protect, upload.single('avatar'), ctrl.updateProfile)
router.put ('/change-password', protect, ctrl.changePassword)

module.exports = router
