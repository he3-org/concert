import { describe, it, expect } from 'vitest';
import { withCache } from '../../cache/cache.js';
import { recordMiss, getCacheStats, resetStats } from '../../cache/stats.js';

describe('cache fallback', () => {
  it('calls fallback when cache disabled via env var', async () => {
    resetStats();
    process.env.CONCERT_CACHE_DISABLED = '1';
    try {
      const result = await withCache(
        '/tmp',
        async () => {
          throw new Error('should not reach cache path');
        },
        async () => 'fallback-value'
      );
      expect(result).toBe('fallback-value');
      const stats = getCacheStats();
      expect(stats.misses).toBeGreaterThan(0);
    } finally {
      delete process.env.CONCERT_CACHE_DISABLED;
    }
  });

  it('records cache miss when fallback is used', async () => {
    resetStats();
    process.env.CONCERT_CACHE_DISABLED = '1';
    try {
      await withCache(
        '/tmp',
        async () => 42,
        async () => 99
      );
      const stats = getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    } finally {
      delete process.env.CONCERT_CACHE_DISABLED;
    }
  });
});
