## Secure Coding Rules — Full Detail

### 1. Validate all inputs at system boundaries

Every value that crosses a trust boundary — HTTP request bodies, query parameters, headers, message queue payloads, file contents, CLI arguments — must be validated before use. Reject invalid input immediately with a 400-level error and a clear message. Do not attempt to sanitize malformed data and continue; reject it. Internal functions may assume their inputs are already valid if the boundary validation is enforced consistently at the entry point.

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),
});

app.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  // result.data is now safe to use
  createUser(result.data);
});
```

### 2. Parameterized queries only

Never build SQL, NoSQL, LDAP, or any other query language strings by concatenating user-controlled values. Use parameterized queries or prepared statements exclusively. ORM query builder methods are acceptable as long as raw interpolation is not used to insert user input. If raw SQL is genuinely necessary, escape values using the database driver's dedicated escape function — not a hand-rolled one.

```typescript
// Wrong — SQL injection risk
const rows = await db.query(`SELECT * FROM orders WHERE user_id = '${userId}'`);

// Correct — parameterized
const rows = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);

// Correct — ORM
const orders = await Order.findAll({ where: { userId } });
```

### 3. Encode all output

Encode data before inserting it into an output context. HTML responses require HTML entity encoding; JSON responses must use a proper serializer (not string concatenation); URLs require percent-encoding. Never assign untrusted content directly to `innerHTML`, `document.write`, or `eval()`. Use a templating engine that auto-escapes by default, and explicitly opt into raw output only when rendering trusted, pre-sanitized content.

```typescript
// Wrong — XSS risk
element.innerHTML = userSuppliedContent;

// Correct — text content only
element.textContent = userSuppliedContent;

// Correct — when HTML is required, sanitize first
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userSuppliedContent);
```

### 4. Enforce authentication and authorization in middleware

Authentication (who are you?) and authorization (what are you allowed to do?) must be enforced in middleware, not scattered through individual handlers or business logic functions. A handler that requires authentication should never reach its body if the request is unauthenticated. Authorization checks for resource ownership or role requirements belong in a dedicated middleware layer applied to entire route groups, not inline conditionals inside handlers.

```typescript
// Attach auth middleware to all routes in the group
const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/admin/users', listUsers);
router.delete('/admin/users/:id', deleteUser);

// requireAuth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 5. Apply least privilege

Every component — database users, service accounts, API tokens, IAM roles — should hold only the permissions it needs to perform its function and nothing more. A service that reads orders should not have write access to the users table. Use separate credentials for read-only and read-write operations where the risk profile differs. Review and prune permissions during code review; do not carry over broad permissions from development into production.

### 6. Store secrets in environment variables or vaults

Secrets — API keys, database passwords, JWT signing keys, OAuth client secrets — must never appear in source code, configuration files committed to version control, or log output. Load them from environment variables or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) at runtime. Provide a `.env.example` file with placeholder values so contributors know which variables are required, and add `.env` to `.gitignore`.

```typescript
// Wrong — secret in source
const client = new StripeClient('sk_live_abc123...');

// Correct — loaded from environment
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
const client = new StripeClient(stripeKey);
```

### 7. Implement CSRF protection

Cross-Site Request Forgery attacks trick authenticated users into submitting state-changing requests from a malicious origin. Protect all state-mutating endpoints (POST, PUT, PATCH, DELETE) with a CSRF token or enforce the `SameSite=Strict` (or `Lax`) cookie attribute. For APIs consumed exclusively by JavaScript clients, requiring a custom header (e.g., `X-Requested-With`) is an acceptable alternative because browsers do not send custom headers in cross-origin requests without a CORS preflight.

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

// Apply to all state-mutating routes
app.post('/transfer', csrfProtection, (req, res) => {
  // handler only reached if CSRF token is valid
});

// Include token in responses for form rendering
app.get('/transfer', csrfProtection, (req, res) => {
  res.render('transfer', { csrfToken: req.csrfToken() });
});
```

### 8. Rate-limit authentication endpoints

Brute-force and credential-stuffing attacks target login, password reset, and token exchange endpoints. Apply rate limiting to these endpoints keyed on client IP and, where applicable, on the targeted account identifier. Use exponential back-off or lockout after a threshold of failures. Distinguish rate-limit responses (429) from authentication failures (401/403) so clients can handle them correctly without leaking information about account existence.

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

app.post('/auth/login', authLimiter, loginHandler);
app.post('/auth/reset-password', authLimiter, resetPasswordHandler);
```

### 9. Validate file uploads

File upload handlers are a common attack surface for storing malicious content or overwhelming server resources. Validate the MIME type from the file's magic bytes (not the `Content-Type` header, which is user-controlled), enforce a maximum file size, and restrict allowed extensions. Store uploaded files outside the web root or in object storage; never execute them. Rename uploaded files to server-generated names to prevent path traversal via the original filename.

```typescript
import { fromBuffer } from 'file-type';
import { randomUUID } from 'crypto';

async function handleUpload(buffer: Buffer, originalName: string) {
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (buffer.length > MAX_BYTES) {
    throw new ValidationError('File exceeds maximum size');
  }

  const type = await fromBuffer(buffer);
  const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!type || !ALLOWED.has(type.mime)) {
    throw new ValidationError('File type not permitted');
  }

  // Store under a server-generated name, not the original
  const storedName = `${randomUUID()}.${type.ext}`;
  await objectStorage.put(storedName, buffer);
  return storedName;
}
```

### 10. Enforce multi-tenant row isolation

In multi-tenant systems, every query that reads or writes tenant-owned data must include a `tenantId` filter derived from the authenticated session — never from user-supplied input in the request body or query string. Relying on application logic to filter results after a broad fetch is insufficient; enforce isolation at the query level. Audit queries during code review by confirming each one carries the tenant constraint. Use a base repository class or query builder wrapper that injects the tenant filter automatically to make omission a compile-time or test-time error rather than a runtime one.

```typescript
// Wrong — tenant ID from request body (user-controlled)
const orders = await Order.findAll({
  where: { tenantId: req.body.tenantId },
});

// Correct — tenant ID from verified session only
const orders = await Order.findAll({
  where: { tenantId: req.user.tenantId },
});

// Better — enforce via a scoped repository
class TenantScopedOrderRepository {
  constructor(private readonly tenantId: string) {}

  findAll() {
    return Order.findAll({ where: { tenantId: this.tenantId } });
  }

  findById(id: string) {
    return Order.findOne({ where: { id, tenantId: this.tenantId } });
  }
}

// In handler — tenantId comes from verified auth, not request
const repo = new TenantScopedOrderRepository(req.user.tenantId);
const orders = await repo.findAll();
```
