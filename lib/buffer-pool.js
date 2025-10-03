/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Buffer Pool for efficient buffer reuse
 * Reduces memory allocations for common request sizes
 */

const POOL_SIZE = 8 * 1024 // 8KB - typical for most API requests
const MAX_POOL_ENTRIES = 50 // Maximum number of pooled buffers

class BufferPool {
  constructor () {
    this.pool = []
    this.hits = 0
    this.misses = 0
  }

  /**
   * Acquire a buffer from the pool or create a new one
   * @param {number} size - requested buffer size
   * @returns {Buffer}
   */
  acquire (size) {
    // For large buffers, don't use the pool
    if (size > POOL_SIZE * 2) {
      this.misses++
      return Buffer.allocUnsafe(size)
    }

    // Try to find a buffer in the pool
    for (let i = 0; i < this.pool.length; i++) {
      const buf = this.pool[i]
      if (buf.length >= size) {
        this.pool.splice(i, 1)
        this.hits++
        return buf.length === size ? buf : buf.slice(0, size)
      }
    }

    // No suitable buffer found, create a new one
    this.misses++
    return Buffer.allocUnsafe(Math.max(size, POOL_SIZE))
  }

  /**
   * Release a buffer back to the pool
   * @param {Buffer} buffer
   */
  release (buffer) {
    // Only pool buffers of reasonable size
    if (buffer.length <= POOL_SIZE * 2 && this.pool.length < MAX_POOL_ENTRIES) {
      // Clear the buffer for security
      buffer.fill(0)
      this.pool.push(buffer)
    }
  }

  /**
   * Get pool statistics
   * @returns {object}
   */
  stats () {
    return {
      size: this.pool.length,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    }
  }

  /**
   * Clear the pool
   */
  clear () {
    this.pool = []
  }
}

// Global buffer pool instance
const globalPool = new BufferPool()

module.exports = {
  BufferPool,
  globalPool,
  acquire: (size) => globalPool.acquire(size),
  release: (buffer) => globalPool.release(buffer),
  stats: () => globalPool.stats(),
  clear: () => globalPool.clear()
}
