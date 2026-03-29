## React Best Practices — Full Detail

### 1. Use `React.memo` only when profiling shows a problem

Wrapping a component in `React.memo` prevents re-renders when props are shallowly equal, but adds comparison overhead on every render. Apply it only after profiling (React DevTools Profiler or a Lighthouse trace) identifies a component as a measurable bottleneck. Premature memoization adds noise, obscures intent, and can mask the real cause of slow renders.

```tsx
// Before: wrap only after profiling confirms wasted renders
const ExpensiveList = React.memo(function ExpensiveList({ items }: Props) {
  return <ul>{items.map(i => <li key={i.id}>{i.label}</li>)}</ul>;
});
```

### 2. No inline objects or arrays in JSX props

Object and array literals created inline in JSX produce a new reference on every render. When passed to a memoized child, this defeats the memo and causes an unnecessary re-render. Hoist constants outside the component or derive them with `useMemo` when the values depend on state or props.

```tsx
// Bad — new object reference every render
<Chart options={{ color: "blue", grid: true }} />

// Good — stable reference
const CHART_OPTIONS = { color: "blue", grid: true };
<Chart options={CHART_OPTIONS} />

// Good — memoized when derived from props
const options = useMemo(() => ({ color: theme.primary, grid: showGrid }), [theme.primary, showGrid]);
<Chart options={options} />
```

### 3. Keys must be stable, unique identifiers — never array indices

React uses the `key` prop to reconcile list items across renders. Using the array index as a key causes incorrect reconciliation when items are reordered, inserted, or deleted: React reuses the wrong DOM node and component state shifts to the wrong item. Always use a value that is stable across renders and unique within the list, such as a database ID.

```tsx
// Bad — index key breaks state on reorder/insert
{items.map((item, index) => <Card key={index} {...item} />)}

// Good — stable ID key
{items.map(item => <Card key={item.id} {...item} />)}
```

### 4. Lazy-load routes and heavy components with `React.lazy` and `Suspense`

Bundling every route and heavy dependency into the initial chunk increases time-to-interactive. Use `React.lazy` to split components into separate chunks loaded on demand, and wrap them with `Suspense` to provide a fallback UI while the chunk loads. Apply at route boundaries first; descend to individual heavy components (rich text editors, chart libraries, map SDKs) where bundle impact justifies it.

```tsx
import { lazy, Suspense } from "react";

const ReportPage = lazy(() => import("./ReportPage"));

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReportPage />
    </Suspense>
  );
}
```

### 5. Avoid SSR/hydration mismatches

React's server render and client hydration must produce identical markup. A mismatch forces React to discard the server HTML and re-render entirely, eliminating the performance benefit of SSR. Common causes: `typeof window` checks during render, `Date.now()` or `Math.random()` calls, locale-dependent formatting, and browser-only APIs accessed at module level. Guard client-only code in `useEffect` or behind a `mounted` state flag. In Next.js App Router, prefer Server Components; add `"use client"` only at the lowest boundary that requires interactivity.

```tsx
// Bad — window is undefined on the server
function Banner() {
  return <div style={{ width: window.innerWidth }}>...</div>;
}

// Good — access browser API only after mount
function Banner() {
  const [width, setWidth] = useState(0);
  useEffect(() => { setWidth(window.innerWidth); }, []);
  return <div style={{ width }}>...</div>;
}
```

### 6. Colocate state as close as possible to where it is used

State that lives higher than necessary causes more components to re-render when it changes and makes the data flow harder to follow. Keep state in the lowest common ancestor of the components that need it. If only one component needs a piece of state, keep it local to that component. Lift state only when sharing is actually required.

```tsx
// Bad — search state lives in the page, forcing re-render of siblings
function Page() {
  const [query, setQuery] = useState("");
  return (
    <>
      <SearchBar query={query} onChange={setQuery} />
      <HeavySidebar />   {/* re-renders on every keystroke */}
    </>
  );
}

// Good — search state lives inside SearchBar
function Page() {
  return (
    <>
      <SearchBar />
      <HeavySidebar />   {/* unaffected by search state */}
    </>
  );
}
```

### 7. Prefer controlled components; use uncontrolled only for file inputs and imperative integrations

A controlled component derives its displayed value from React state, making the UI a deterministic function of state. This is easy to test, validate, and reason about. Uncontrolled components read their value from the DOM via a ref; they are appropriate for `<input type="file">` (whose value cannot be set programmatically) or when integrating with an imperative third-party library (e.g., a rich text editor that manages its own DOM). Do not mix controlled and uncontrolled for the same input — React will warn and behavior becomes undefined.

```tsx
// Controlled — value driven by state
function NameField() {
  const [name, setName] = useState("");
  return <input value={name} onChange={e => setName(e.target.value)} />;
}

// Uncontrolled — appropriate for file input
function FileUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const handleSubmit = () => console.log(ref.current?.files);
  return <input type="file" ref={ref} />;
}
```

### 8. Clean up effects to prevent memory leaks and stale closures

Every `useEffect` that starts an async operation, subscribes to an external source, or sets a timer must return a cleanup function. Without cleanup, subscriptions fire after the component unmounts, timers set state on dead components, and pending fetches apply stale results to new renders. For `fetch` calls, use an `AbortController`; for subscriptions, call the unsubscribe function; for timers, call `clearTimeout` / `clearInterval`.

```tsx
// Bad — no cleanup; setState may fire after unmount
useEffect(() => {
  fetchUser(id).then(user => setUser(user));
}, [id]);

// Good — aborted on unmount or when id changes
useEffect(() => {
  const controller = new AbortController();
  fetchUser(id, { signal: controller.signal })
    .then(user => setUser(user))
    .catch(err => { if (err.name !== "AbortError") setError(err); });
  return () => controller.abort();
}, [id]);

// Good — subscription cleanup
useEffect(() => {
  const unsubscribe = store.subscribe(id, handler);
  return unsubscribe;
}, [id]);
```

### 9. No `useEffect` for derived state — compute during render

Using `useEffect` to copy or transform state into another state variable introduces an extra render cycle: the component renders with stale derived state, the effect fires, and then it renders again with the correct value. This causes flicker and is harder to trace. Derived values should be computed directly during render, or memoized with `useMemo` when the computation is expensive.

```tsx
// Bad — extra render cycle, flicker risk
const [filtered, setFiltered] = useState(items);
useEffect(() => {
  setFiltered(items.filter(i => i.active));
}, [items]);

// Good — derived synchronously during render
const filtered = items.filter(i => i.active);

// Good — memoized when computation is expensive
const filtered = useMemo(() => items.filter(i => i.active), [items]);
```

### 10. Avoid prop drilling past 2 levels — use context or composition

Passing props through intermediate components that do not use them (prop drilling) creates tight coupling between layers, makes refactoring difficult, and forces unrelated components to re-render when the prop changes. When a value needs to reach components more than two levels deep, use React Context, a state management library, or component composition (render props / children slots) to pass it directly.

```tsx
// Bad — theme passed through multiple layers that don't use it
<Page theme={theme}>
  <Layout theme={theme}>
    <Sidebar theme={theme}>
      <NavItem theme={theme} />
    </Sidebar>
  </Layout>
</Page>

// Good — context eliminates the drilling
const ThemeContext = createContext<Theme>(defaultTheme);

function App() {
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  );
}

function NavItem() {
  const theme = useContext(ThemeContext);
  return <a style={{ color: theme.primary }}>...</a>;
}
```

### 11. Wrap every major UI section with an error boundary

An unhandled render error anywhere in the React tree unmounts the entire application. Error boundaries catch render-phase errors in their subtree and display a fallback, keeping the rest of the app functional. Place an error boundary at the application root and at every major independent section (route, sidebar, widget panel). Use a library such as `react-error-boundary` to avoid writing the class component boilerplate by hand.

```tsx
import { ErrorBoundary } from "react-error-boundary";

function App() {
  return (
    <ErrorBoundary fallback={<AppCrashPage />}>
      <ErrorBoundary fallback={<SidebarError />}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary fallback={<MainContentError />}>
        <MainContent />
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
```
