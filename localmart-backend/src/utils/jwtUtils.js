const jwt     = require('jsonwebtoken')
const { AppError } = require('./AppError')

// ── Sign token ─────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  })

// ── Verify token ───────────────────────────────────────────
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError('Token expired. Please log in again.', 401)
    throw new AppError('Invalid token. Please log in again.', 401)
  }
}

// ── Send token in cookie + response ────────────────────────
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id)

  const cookieOptions = {
    expires:  new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  }

  // Strip password from output
  user.password = undefined

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      data: { user },
    })
}

module.exports = { signToken, verifyToken, sendTokenResponse }
