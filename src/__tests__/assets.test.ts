import { afterEach, describe, expect, it } from 'vitest';
import * as http from 'node:http';
import { defaultFetcher } from '../lib/assets.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.defineProperty(globalThis, 'fetch', {
    value: originalFetch,
    configurable: true,
    writable: true,
  });
});

describe('defaultFetcher', () => {
  it('falls back to node http when global fetch is unavailable', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const server = http.createServer((_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve test server address');
      }
      const res = await defaultFetcher(`http://127.0.0.1:${address.port}/`);
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      await expect(res.text()).resolves.toBe('ok');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
});
