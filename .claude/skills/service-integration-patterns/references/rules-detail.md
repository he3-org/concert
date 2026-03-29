## Service Integration Rules — Full Detail

### 1. Use the adapter pattern for external services

Wrap every third-party API, database, or external system behind an adapter interface. The adapter translates between the external API's data model and your domain model. This isolates your codebase from breaking changes in external APIs and makes testing with fakes trivial.

```
domain logic → adapter interface → concrete adapter → external API
```

```typescript
interface PaymentAdapter {
  charge(params: ChargeParams): Promise<ChargeResult>;
}

class StripeAdapter implements PaymentAdapter {
  async charge(params: ChargeParams): Promise<ChargeResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency,
    });
    return { id: intent.id as PaymentId, status: mapStatus(intent.status) };
  }
}
```

### 2. Retry with exponential backoff and jitter

Transient failures (network timeouts, 503 responses) must be retried. Use exponential backoff (`baseDelay * 2^attempt`) with random jitter to avoid thundering herds. Set a maximum retry count (typically 3–5). Never retry non-idempotent operations without an idempotency key.

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts - 1 || !isRetryable(err)) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
      await sleep(delay);
    }
  }
  throw new Error("unreachable");
}
```

### 3. Implement circuit breakers for failing dependencies

When a dependency fails repeatedly, open the circuit to stop sending requests and allow the dependency to recover. Use a library (e.g., `gobreaker`, `opossum`, `resilience4j`). Configure sensible thresholds: failure rate, minimum request volume, and recovery timeout.

```typescript
import CircuitBreaker from "opossum";

const breaker = new CircuitBreaker(callExternalService, {
  threshold: 50,       // open when 50% of requests fail
  timeout: 5000,       // calls taking longer than 5s are failures
  resetTimeout: 30000, // attempt recovery after 30s
});

breaker.fallback(() => getCachedResult());
```

### 4. Set timeouts on all external calls

Every HTTP request, database query, and RPC call must have an explicit timeout. Use `context.WithTimeout` in Go and `AbortController` / request timeouts in TypeScript. Default to 5 seconds for HTTP calls and 30 seconds for database queries. Tune based on observed P99 latency.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5_000);

try {
  const response = await fetch(url, { signal: controller.signal });
  return await response.json();
} finally {
  clearTimeout(timeoutId);
}
```

### 5. Return structured error responses

When an external call fails, return a structured error that includes: the operation that failed, the underlying error, whether the error is retryable, and a correlation ID for tracing. Never expose raw external error details to end users.

```typescript
class IntegrationError extends Error {
  constructor(
    public readonly operation: string,
    public readonly cause: unknown,
    public readonly retryable: boolean,
    public readonly correlationId: string,
  ) {
    super(`Integration error in ${operation} [${correlationId}]`);
  }
}
```

### 6. Implement health checks

Every service must expose a health endpoint (`/healthz` or `/health`) that checks connectivity to its critical dependencies (database, cache, message broker). Health checks must be lightweight and not trigger heavy operations.

```typescript
app.get("/healthz", async (req, res) => {
  const checks = await Promise.allSettled([
    db.query("SELECT 1"),
    cache.ping(),
  ]);
  const healthy = checks.every((c) => c.status === "fulfilled");
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks: checks.map((c, i) => ({
      name: ["db", "cache"][i],
      ok: c.status === "fulfilled",
    })),
  });
});
```

### 7. Degrade gracefully for non-critical dependencies

If a non-critical service (analytics, recommendations, feature flags) is unavailable, serve a degraded experience instead of failing the entire request. Use cached data, defaults, or feature flags to control degradation behavior.

```typescript
async function getRecommendations(userId: UserId): Promise<Recommendation[]> {
  try {
    return await recommendationService.fetch(userId);
  } catch {
    logger.warn("recommendations unavailable, serving defaults");
    return DEFAULT_RECOMMENDATIONS;
  }
}
```

### 8. Use connection pooling

Database connections, HTTP clients, and gRPC channels must use connection pools. Configure pool size based on expected concurrency. Reuse clients — never create a new HTTP client per request.

```typescript
// Bad: new client per request
async function fetchUser(id: string) {
  const client = new HttpClient(); // never do this
  return client.get(`/users/${id}`);
}

// Good: shared client initialized once at startup
const httpClient = new HttpClient({ maxSockets: 50 });

async function fetchUser(id: string) {
  return httpClient.get(`/users/${id}`);
}
```

### 9. Use idempotency keys for non-idempotent operations

When calling external APIs that mutate state (payments, order creation), include a client-generated idempotency key. This ensures that retries do not create duplicate side effects.

```typescript
async function createOrder(order: NewOrder): Promise<Order> {
  const idempotencyKey = generateIdempotencyKey(order);
  return paymentAdapter.createOrder(order, { idempotencyKey });
}
```

### 10. Use dead letter queues for async processing

Messages that fail processing after all retries must be moved to a dead letter queue (DLQ) for manual investigation. Never silently drop failed messages. Set up alerts on DLQ depth.

```typescript
async function processMessage(msg: Message): Promise<void> {
  try {
    await handleMessage(msg);
    await queue.ack(msg);
  } catch (err) {
    if (msg.attemptCount >= MAX_ATTEMPTS) {
      await dlq.send(msg, { reason: String(err) });
      await queue.ack(msg);
    } else {
      await queue.nack(msg, { requeue: true });
    }
  }
}
```

### 11. Instrument external calls with metrics and traces

Every external call must emit: latency (histogram), success/failure count (counter), and a distributed trace span. Use OpenTelemetry or your observability stack's SDK. Tag spans with the service name, operation, and response status.

```typescript
async function callWithTracing<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### 12. Centralize client configuration

HTTP base URLs, timeouts, retry policies, and authentication credentials for external services must be defined in a centralized configuration layer, not scattered across calling code. Use environment-specific configuration.

```typescript
// config/integrations.ts
export const integrationConfig = {
  payments: {
    baseUrl: env.PAYMENTS_BASE_URL,
    timeoutMs: 5_000,
    maxRetries: 3,
    apiKey: env.PAYMENTS_API_KEY,
  },
  notifications: {
    baseUrl: env.NOTIFICATIONS_BASE_URL,
    timeoutMs: 3_000,
    maxRetries: 2,
  },
} as const;
```

### 13. Validate responses from external services

Do not trust that an external API returns the expected schema. Validate response shape and types before using the data. Handle unexpected fields gracefully and log schema violations for investigation.

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

async function fetchUser(id: string): Promise<User> {
  const raw = await httpClient.get(`/users/${id}`);
  const parsed = UserSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn("unexpected user schema", { errors: parsed.error.issues });
    throw new IntegrationError("fetchUser", parsed.error, false, correlationId());
  }
  return parsed.data;
}
```

### 14. Implement request deduplication

For high-throughput systems, deduplicate concurrent requests to the same external resource. Use in-flight request coalescing (singleflight in Go, request deduplication in GraphQL DataLoader) to reduce load on dependencies.

```typescript
const inFlight = new Map<string, Promise<unknown>>();

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) return inFlight.get(key) as Promise<T>;
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
```

### 15. Version your adapters

When an external API introduces a new version, create a new adapter version alongside the old one. Migrate consumers incrementally. Never modify an existing adapter in place to support a new API version — that breaks existing consumers.

```
adapters/
  payments/
    payments-adapter.v1.ts   ← existing consumers stay on this
    payments-adapter.v2.ts   ← new API version, new consumers migrate here
    payments-adapter.ts      ← re-exports the current stable version
```
