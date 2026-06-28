const { getClient } = require("../cache/redis");

const memoryLocks = new Set();

/**
 * Attempts to acquire an exclusive lock for a given resource.
 * Uses Redis if available, falling back to a local in-memory Set.
 * 
 * @param {string} resourceId - The unique identifier for the lock (e.g., user ID)
 * @param {number} ttlSeconds - Time-to-live for the lock in seconds (default: 60)
 * @returns {Promise<boolean>} True if lock was acquired, false if already held
 */
async function acquireLock(resourceId, ttlSeconds = 60) {
  const redis = getClient();
  const lockKey = `earnwave:lock:${resourceId}`;

  if (redis) {
    try {
      // NX: Only set the key if it does not already exist.
      // EX: Set the specified expire time, in seconds.
      const result = await redis.set(lockKey, "locked", {
        NX: true,
        EX: ttlSeconds
      });
      return result === "OK";
    } catch (error) {
      console.error(`[Mutex] Redis lock error for ${resourceId}:`, error);
      // Fallback to local memory lock on Redis failure
    }
  }

  if (memoryLocks.has(lockKey)) {
    return false;
  }
  
  memoryLocks.add(lockKey);
  
  // Auto-expire the memory lock to prevent permanent deadlocks
  setTimeout(() => {
    memoryLocks.delete(lockKey);
  }, ttlSeconds * 1000);
  
  return true;
}

/**
 * Releases an exclusive lock for a given resource.
 * 
 * @param {string} resourceId - The unique identifier for the lock
 */
async function releaseLock(resourceId) {
  const redis = getClient();
  const lockKey = `earnwave:lock:${resourceId}`;

  if (redis) {
    try {
      await redis.del(lockKey);
    } catch (error) {
      console.error(`[Mutex] Redis unlock error for ${resourceId}:`, error);
    }
  }

  memoryLocks.delete(lockKey);
}

module.exports = { acquireLock, releaseLock };
