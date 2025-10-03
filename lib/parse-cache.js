/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */

const crypto = require('node:crypto')

/**
 * Parse cache with TTL for JSON payloads
 * Caches parsed results for identical request bodies
 */

const DEFAULT_TTL = 60000 // 60 seconds
const MAX_CACHE_SIZE = 100 // Maximum number of cached entries
const MAX_CACHEABLE_SIZE = 10 * 1024 // Only cache bodies <= 10KB

class ParseCache {
  constructor (ttl = DEFAULT_TTL, maxSize = MAX_CACHE_SIZE) {
    this.cache = new Map()
    this.ttl = ttl
    this.maxSize = maxSize
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  /**
   * Generate a cache key from the request body
   * @param {string|Buffer} body
   * @returns {string}
   */
  _generateKey (body) {
    // For small bodies, use the body itself as key
    if (body.length < 100) {
      return typeof body === 'string' ? body : body.toString()
    }

    // For larger bodies, use a hash
    const hash = crypto.createHash('sha256')
    hash.update(typeof body === 'string' ? body : body.toString())
    return hash.digest('hex')
  }

  /**
   * Get cached parse result
   * @param {string|Buffer} body
   * @returns {any|null}
   */
  get (body) {
    // Don't cache large bodies
    if (body.length > MAX_CACHEABLE_SIZE) {
      return null
    }

    const key = this._generateKey(body)
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return entry.value
  }

  /**
   * Set cached parse result
   * @param {string|Buffer} body
   * @param {any} value
   */
  set (body, value) {
    // Don't cache large bodies
    if (body.length > MAX_CACHEABLE_SIZE) {
      return
    }

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
      this.evictions++
    }

    const key = this._generateKey(body)
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl
    })
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  stats () {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: this.hits / (this.hits + this.misses) || 0
    }
  }

  /**
   * Clear the cache
   */
  clear () {
    this.cache.clear()
  }

  /**
   * Cleanup expired entries
   */
  cleanup () {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

// Global cache instances for different parsers
const jsonCache = new ParseCache()
const urlencodedCache = new ParseCache()

// Periodic cleanup every 5 minutes
setInterval(() => {
  jsonCache.cleanup()
  urlencodedCache.cleanup()
}, 5 * 60 * 1000).unref()

module.exports = {
  ParseCache,
  jsonCache,
  urlencodedCache
}
