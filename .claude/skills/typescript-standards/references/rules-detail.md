## TypeScript Rules — Full Detail

### 1. Strict mode is mandatory
Every `tsconfig.json` must set `"strict": true`. Do not disable individual strict checks such as `strictNullChecks` or `noImplicitAny`. If a library causes strict-mode errors, create a minimal type declaration file rather than loosening the compiler.

### 2. Never use `any`
Use `unknown` when the type is genuinely not known, then narrow with type guards before accessing properties. If tempted to use `any` for a third-party library, write a typed wrapper or use a declaration file.

### 3. Type all public API boundaries explicitly
Every exported function, method, and class must have explicit parameter types and return types. Do not rely on type inference for anything that crosses a module boundary. Internal helper functions may use inference when the types are obvious.

### 4. Use discriminated unions for state machines and variants
Model states with a shared literal discriminant field (e.g., `type: "loading" | "success" | "error"`). Each variant carries only the data relevant to that state. Never use optional fields to represent mutually exclusive states.

### 5. Use branded types for domain identifiers
Wrap primitive identifiers (user IDs, order IDs, etc.) with branded types to prevent accidental mixing.
```typescript
type UserId = string & { readonly __brand: "UserId" };
```

### 6. Use `as const` for literal types
When defining a fixed set of values (e.g., configuration objects, action types), use `as const` to preserve literal types instead of widening to `string` or `number`.

### 7. Exhaustive switch statements with `never`
Every `switch` on a discriminated union must include a `default` case that assigns to `never`. This ensures the compiler catches unhandled variants when new ones are added.
```typescript
default: {
  const _exhaustive: never = action;
  throw new Error(`Unhandled action: ${_exhaustive}`);
}
```

### 8. Prefer `unknown` over `any` in catch blocks
Type caught errors as `unknown` and narrow before accessing properties. Use a helper like `isError(e): e is Error` for consistent narrowing.

### 9. `readonly` by default
Mark object properties, arrays, and tuples as `readonly` unless mutation is required by the algorithm. Prefer `ReadonlyArray<T>` and `Readonly<T>` for function parameters.

### 10. No non-null assertions (`!`) in production code
Non-null assertions bypass the type checker. Use explicit null checks or early returns instead. Acceptable only in test files where the setup guarantees a value exists.

### 11. Prefer `interface` for object shapes, `type` for unions and intersections
Use `interface` when the shape may be extended or implemented. Use `type` for computed types, mapped types, unions, and intersections.

### 12. No `enum` — use union types or `as const` objects
TypeScript enums produce runtime code and have surprising behaviors with reverse mappings. Use `type Status = "active" | "inactive"` or a `const` object with `typeof` extraction.

### 13. Template literal types for string patterns
When a string must follow a pattern (e.g., `"on${string}"`), use template literal types to enforce it at compile time.

### 14. Use `satisfies` for type validation without widening
When validating that a value matches a type but wanting to preserve the narrower inferred type, use the `satisfies` operator.

### 15. Avoid type assertions (`as`)
Type assertions bypass the type checker. If a value needs to be treated as a different type, refactor to make the types align or use a type guard. The only acceptable use is in test utilities.
