// ─────────────────────────────────────────────────────────
//  APIFeatures — chainable query builder for Mongoose
// ─────────────────────────────────────────────────────────
class APIFeatures {
  constructor(query, queryString) {
    this.query       = query
    this.queryString = queryString
  }

  // ── Filter ──────────────────────────────────────────────
  filter() {
    const q = { ...this.queryString }
    const excluded = ['page', 'sort', 'limit', 'fields', 'search', '_t']  // ← add '_t'
    excluded.forEach(e => delete q[e])

    let queryStr = JSON.stringify(q)
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)
    this.query = this.query.find(JSON.parse(queryStr))
    return this
  }

  // ── Search ──────────────────────────────────────────────
  search(fields = []) {
    if (this.queryString.search) {
      const regex = new RegExp(this.queryString.search, 'i')
      const conditions = fields.map(f => ({ [f]: regex }))
      this.query = this.query.find({ $or: conditions })
    }
    return this
  }

  // ── Sort ────────────────────────────────────────────────
  sort(defaultSort = '-createdAt') {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ')
      this.query = this.query.sort(sortBy)
    } else {
      this.query = this.query.sort(defaultSort)
    }
    return this
  }

  // ── Field limiting ──────────────────────────────────────
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ')
      this.query = this.query.select(fields)
    } else {
      this.query = this.query.select('-__v')
    }
    return this
  }

  // ── Pagination ──────────────────────────────────────────
  paginate(defaultLimit = 12) {
    const page  = Math.max(1, parseInt(this.queryString.page,  10) || 1)
    const limit = Math.min(100, parseInt(this.queryString.limit, 10) || defaultLimit)
    this.query  = this.query.skip((page - 1) * limit).limit(limit)
    this._page  = page
    this._limit = limit
    return this
  }
}

module.exports = APIFeatures

