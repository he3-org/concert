let cacheHits = 0;
let cacheMisses = 0;

export function getCacheStats(): { hits: number; misses: number } {
  return { hits: cacheHits, misses: cacheMisses };
}

export function recordHit(): void {
  cacheHits++;
}

export function recordMiss(): void {
  cacheMisses++;
}

export function resetStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
}
