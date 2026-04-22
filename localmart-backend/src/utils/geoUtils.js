// ─────────────────────────────────────────────────────────
//  Geo utilities  — no external API required
// ─────────────────────────────────────────────────────────

/**
 * Haversine distance between two lat/lng points → km
 */
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R     = 6371
  const dLat  = toRad(lat2 - lat1)
  const dLng  = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const toRad = (deg) => (deg * Math.PI) / 180

/**
 * Build a MongoDB $geoWithin query
 * center: [lng, lat]  radius: km
 */
const nearbyQuery = (lng, lat, radiusKm = 10) => ({
  location: {
    $geoWithin: {
      $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusKm / 6371],
    },
  },
})

/**
 * Build a MongoDB $near query (requires 2dsphere index)
 * Returns docs sorted by distance
 */
const nearQuery = (lng, lat, maxDistanceKm = 10, minDistanceKm = 0) => ({
  location: {
    $near: {
      $geometry:    { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      $maxDistance: maxDistanceKm  * 1000,
      $minDistance: minDistanceKm  * 1000,
    },
  },
})

/**
 * Validate lat/lng values
 */
const validateCoords = (lat, lng) => {
  const la = parseFloat(lat)
  const ln = parseFloat(lng)
  if (isNaN(la) || la < -90  || la > 90)  return false
  if (isNaN(ln) || ln < -180 || ln > 180) return false
  return true
}

module.exports = { getDistance, nearbyQuery, nearQuery, validateCoords }
