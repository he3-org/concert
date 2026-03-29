## Go Rules — Full Detail

### 1. Always handle errors — never discard with `_`

Every function that returns an error must have that error checked. Silently discarding errors with `_` hides failures that will surface later as confusing panics or corrupt state. If an error is genuinely unrecoverable, log it and return it up the call stack.

```go
// bad
result, _ = os.ReadFile("config.json")

// good
result, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
```

### 2. Wrap errors with `%w` for chain inspection

Use `fmt.Errorf("context: %w", err)` to wrap errors with context while preserving the original error for callers who use `errors.Is` and `errors.As`. Never format errors with `%v` when you want them to remain inspectable. The wrapping message should describe what the current function was trying to do, not repeat what the inner error already says.

```go
// bad — loses the original error type
return fmt.Errorf("failed to open file: %v", err)

// good — preserves error chain
return fmt.Errorf("open config file %q: %w", path, err)

// unwrapping at the call site
if errors.Is(err, os.ErrNotExist) {
    // handle missing file
}
```

### 3. Keep interfaces small and consumer-defined

Define interfaces at the point of use, not at the point of implementation. An interface with one or two methods is almost always the right size. Large interfaces force implementors to carry methods they don't need and make mocking harder. The standard library's `io.Reader` (one method) and `io.Writer` (one method) are the canonical examples.

```go
// bad — large interface defined in the package that implements it
type UserRepository interface {
    GetUser(id string) (*User, error)
    ListUsers() ([]*User, error)
    CreateUser(u *User) error
    UpdateUser(u *User) error
    DeleteUser(id string) error
}

// good — small interface defined where it is consumed
type UserGetter interface {
    GetUser(id string) (*User, error)
}

func NewProfileHandler(users UserGetter) *ProfileHandler { ... }
```

### 4. Propagate `context.Context` as the first parameter

Every function that performs I/O, calls an external service, or may need to be cancelled must accept a `context.Context` as its first parameter, conventionally named `ctx`. Never store a context in a struct field. Never pass `nil` — use `context.Background()` or `context.TODO()` at the top of a call chain when no context exists yet.

```go
// bad — no cancellation support
func FetchUser(id string) (*User, error) { ... }

// good
func FetchUser(ctx context.Context, id string) (*User, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, fmt.Errorf("build request: %w", err)
    }
    ...
}
```

### 5. Table-driven tests with `testify` assertions

Write tests as a slice of named cases iterated with `t.Run`. This makes it easy to add cases, see which scenario failed, and run a single case with `-run`. Use `github.com/stretchr/testify/assert` for non-fatal checks and `require` for checks that must pass before the test can continue.

```go
func TestAdd(t *testing.T) {
    cases := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 1, 2, 3},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            assert.Equal(t, tc.expected, Add(tc.a, tc.b))
        })
    }
}
```

### 6. Accept interfaces, return structs

Function parameters should be interfaces so callers can pass any satisfying type (including test fakes). Return values should be concrete structs so callers get the full API without needing a type assertion. Returning an interface from a constructor is only justified when you intentionally want to hide the concrete type.

```go
// bad — parameter is concrete, return is interface
func NewCache(s *RedisStore) CacheInterface { ... }

// good — parameter is interface, return is concrete
func NewCache(s Store) *Cache { ... }
```

### 7. Goroutine lifecycle ownership

Every goroutine must have a clear owner responsible for ensuring it terminates. Use `sync.WaitGroup` to wait for goroutines to finish before the owning function returns. Pass a `context.Context` for cancellation. Never launch a goroutine without a strategy for joining or stopping it — leaked goroutines accumulate silently and cause memory and resource exhaustion.

```go
func processItems(ctx context.Context, items []Item) error {
    var wg sync.WaitGroup
    errc := make(chan error, len(items))

    for _, item := range items {
        wg.Add(1)
        go func(it Item) {
            defer wg.Done()
            if err := process(ctx, it); err != nil {
                errc <- err
            }
        }(item)
    }

    wg.Wait()
    close(errc)

    for err := range errc {
        if err != nil {
            return fmt.Errorf("process items: %w", err)
        }
    }
    return nil
}
```

### 8. Standard project layout

Organize code following the conventions of the Go ecosystem:

- `cmd/<name>/main.go` — entry points, one per binary. Keep `main.go` minimal; delegate to packages immediately.
- `internal/` — packages that must not be imported by external modules. Use for all application-specific code that is not a public library.
- `pkg/` — packages intended for external consumption. Only create this directory if the module is genuinely a library used by others.
- No `init()` functions. `init()` runs implicitly, making initialization order opaque and testing harder. Use explicit constructors (e.g., `NewX(...)`) instead.
- No global mutable state. Pass dependencies via constructor arguments or function parameters. Global state makes tests order-dependent and concurrent code unsafe.

```
myapp/
  cmd/
    server/
      main.go
  internal/
    handler/
    store/
    model/
  go.mod
  go.sum
```
