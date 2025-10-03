/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Content-Type parsing cache
 * Caches parsed content-type headers to avoid repeated parsing
 */

const MAX_CACHE_SIZE = 50
const COMMON_TYPES = {
  'application/json': { type: 'application/json', parameters: {} },
  'application/json; charset=utf-8': { type: 'application/json', parameters: { charset: 'utf-8' } },
  'application/x-www-form-urlencoded': { type: 'application/x-www-form-urlencoded', parameters: {} },
  'application/x-www-form-urlencoded; charset=utf-8': { type: 'application/x-www-form-urlencoded', parameters: { charset: 'utf-8' } },
  'text/plain': { type: 'text/plain', parameters: {} },
  'text/plain; charset=utf-8': { type: 'text/plain', parameters: { charset: 'utf-8' } }
}

class ContentTypeCache {
  constructor () {
    this.cache = new Map(Object.entries(COMMON_TYPES))
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get cached content-type or parse and cache it
   * @param {string} header
   * @param {function} parser - contentType.parse function
   * @returns {object}
   */
  parse (header, parser) {
    const cached = this.cache.get(header)

    if (cached) {
      this.hits++
      return cached
    }

    this.misses++

    // Parse the content-type
    const parsed = parser(header)

    // Cache if we have room
    if (this.cache.size < MAX_CACHE_SIZE) {
      this.cache.set(header, parsed)
    }

    return parsed
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
      hitRate: this.hits / (this.hits + this.misses) || 0
    }
  }

  /**
   * Clear the cache (except common types)
   */
  clear () {
    this.cache = new Map(Object.entries(COMMON_TYPES))
  }
}

// Global content-type cache
const globalCache = new ContentTypeCache()

module.exports = {
  ContentTypeCache,
  globalCache,
  parse: (header, parser) => globalCache.parse(header, parser),
  stats: () => globalCache.stats(),
  clear: () => globalCache.clear()
}
