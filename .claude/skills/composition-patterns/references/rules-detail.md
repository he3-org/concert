## Composition Patterns — Full Detail

### 1. Use compound components for complex, multi-part UI

When a component has multiple related sub-parts that share state or behavior, model it as a compound component. Expose sub-components as named properties on the parent. This keeps the public API cohesive while allowing consumers to control layout and composition.

```tsx
const Tabs = ({ children, defaultTab }: TabsProps) => {
  const [active, setActive] = React.useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
};

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs defaultTab="overview">
  <Tabs.List>
    <Tabs.Tab id="overview">Overview</Tabs.Tab>
    <Tabs.Tab id="details">Details</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="overview">...</Tabs.Panel>
  <Tabs.Panel id="details">...</Tabs.Panel>
</Tabs>
```

### 2. Use context for dependency injection, not global state

Context is the correct mechanism for passing dependencies (services, configuration, callbacks) through a component tree without prop drilling. It is not a replacement for a state management solution. Context values should be stable references — avoid passing raw objects or functions created inline at the provider call site.

```tsx
interface AnalyticsService {
  track: (event: string, payload?: Record<string, unknown>) => void;
}

const AnalyticsContext = React.createContext<AnalyticsService | null>(null);

const useAnalytics = (): AnalyticsService => {
  const ctx = React.useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics must be used within AnalyticsProvider");
  return ctx;
};

const AnalyticsProvider = ({ service, children }: { service: AnalyticsService; children: React.ReactNode }) => (
  <AnalyticsContext.Provider value={service}>
    {children}
  </AnalyticsContext.Provider>
);
```

### 3. Extract shared stateful logic into custom hooks

Any stateful logic that is used in more than one component, or that makes a component difficult to read and test, belongs in a custom hook. Custom hooks are the primary unit of reuse for behavior. Keep each hook focused on a single concern.

```tsx
const useDisclosure = (initial = false) => {
  const [isOpen, setIsOpen] = React.useState(initial);
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, open, close, toggle };
};

// Usage
const Modal = () => {
  const { isOpen, open, close } = useDisclosure();
  return (
    <>
      <button onClick={open}>Open</button>
      {isOpen && <Dialog onClose={close} />}
    </>
  );
};
```

### 4. Render props are an escape hatch — prefer `children`

The render prop pattern (passing a function as a prop) gives the consumer full control over what is rendered. Use it only when `children` cannot express the required flexibility, such as when the consumer needs access to internal state that cannot be lifted. In all other cases, prefer composing with `children` directly.

```tsx
// Prefer: children for layout composition
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

// Acceptable escape hatch: render prop for internal state access
<VirtualList
  items={rows}
  renderItem={(item, index) => (
    <Row key={item.id} item={item} isEven={index % 2 === 0} />
  )}
/>
```

### 5. Use the slot pattern for flexible layout composition

When a component needs to accept content in multiple named positions (header, footer, sidebar, actions), define explicit slot props typed as `React.ReactNode`. This is more predictable than render props and keeps JSX readable.

```tsx
interface PageLayoutProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const PageLayout = ({ header, sidebar, actions, children }: PageLayoutProps) => (
  <div className="page">
    <header className="page-header">
      {header}
      {actions && <div className="page-actions">{actions}</div>}
    </header>
    <div className="page-body">
      {sidebar && <aside className="page-sidebar">{sidebar}</aside>}
      <main className="page-main">{children}</main>
    </div>
  </div>
);

// Usage
<PageLayout
  header={<h1>Dashboard</h1>}
  sidebar={<NavMenu />}
  actions={<Button>Export</Button>}
>
  <DashboardContent />
</PageLayout>
```

### 6. Place provider boundaries at the route level, not the app root

Providers should wrap only the subtree that actually needs them. Placing every provider at the app root creates unnecessary coupling, increases re-render scope, and makes it harder to understand which parts of the application depend on which values. Route-level boundaries make dependencies explicit and keep component trees easier to reason about.

```tsx
// Avoid: everything at the app root
const App = () => (
  <UserProvider>
    <ThemeProvider>
      <AnalyticsProvider>
        <Router>
          <Routes />
        </Router>
      </AnalyticsProvider>
    </ThemeProvider>
  </UserProvider>
);

// Prefer: providers scoped to the subtree that needs them
const DashboardRoute = () => (
  <AnalyticsProvider service={analyticsService}>
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  </AnalyticsProvider>
);
```

### 7. Compose providers — avoid deeply nested provider stacks

When multiple providers are needed at the same boundary, compose them into a single component rather than stacking them inline. This reduces nesting, makes the dependency set easier to audit, and allows the composition to be moved without touching individual consumers.

```tsx
// Avoid: inline stacking
const FeatureShell = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <FeatureFlagsProvider>
      <PermissionsProvider>
        <NotificationsProvider>
          {children}
        </NotificationsProvider>
      </PermissionsProvider>
    </FeatureFlagsProvider>
  </AuthProvider>
);

// Prefer: composed provider
const composeProviders = (...providers: React.ComponentType<{ children: React.ReactNode }>[]) => {
  return ({ children }: { children: React.ReactNode }) =>
    providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
};

const FeatureProviders = composeProviders(
  AuthProvider,
  FeatureFlagsProvider,
  PermissionsProvider,
  NotificationsProvider,
);

const FeatureShell = ({ children }: { children: React.ReactNode }) => (
  <FeatureProviders>{children}</FeatureProviders>
);
```

### 8. Compose hooks to build layered behavior

Custom hooks can call other custom hooks. Use this to build layered abstractions: low-level hooks handle a single concern (data fetching, local state, event binding) and higher-level hooks compose them into cohesive behavior. This keeps each hook testable in isolation and avoids monolithic hooks with many responsibilities.

```tsx
// Low-level hooks
const useFetch = <T>(url: string) => { /* fetch logic */ };
const usePagination = (total: number, pageSize: number) => { /* pagination logic */ };

// Composed hook
const useUserList = () => {
  const pagination = usePagination(0, 20);
  const { data, loading, error } = useFetch<UserListResponse>(
    `/api/users?page=${pagination.page}&size=${pagination.pageSize}`,
  );

  return {
    users: data?.items ?? [],
    loading,
    error,
    pagination,
  };
};
```

### 9. Keep component interfaces narrow

A component's props should express only what it needs to render or respond to user interaction. Avoid passing large objects or entire store slices when only a few fields are needed. Narrow interfaces reduce coupling, make components easier to reuse across contexts, and make prop changes easier to track.

```tsx
// Avoid: wide interface coupling the component to a domain model
const UserCard = ({ user }: { user: User }) => (
  <div>{user.profile.displayName}</div>
);

// Prefer: narrow interface
const UserCard = ({ displayName, avatarUrl }: { displayName: string; avatarUrl: string }) => (
  <div>
    <img src={avatarUrl} alt="" />
    {displayName}
  </div>
);
```

### 10. Separate container and presentational concerns

Components that fetch data, subscribe to stores, or coordinate side effects should not also be responsible for visual presentation. Extract the presentational layer into a stateless component that accepts only the data it needs. The container component handles orchestration; the presentational component handles layout and rendering.

```tsx
// Presentational — no data fetching, no side effects
const UserProfileView = ({ name, email, avatarUrl }: UserProfileViewProps) => (
  <section>
    <img src={avatarUrl} alt={name} />
    <h2>{name}</h2>
    <p>{email}</p>
  </section>
);

// Container — orchestration only
const UserProfileContainer = ({ userId }: { userId: string }) => {
  const { data, loading } = useUserProfile(userId);
  if (loading) return <Spinner />;
  if (!data) return null;
  return <UserProfileView name={data.name} email={data.email} avatarUrl={data.avatarUrl} />;
};
```

### 11. No HOCs — use hooks or composition instead

Higher-order components add an invisible layer to the component tree, obscure the origin of props, and complicate debugging. Any cross-cutting concern that was previously handled with a HOC (authentication guards, analytics tracking, feature flags) can be handled with a custom hook or by composing components directly. Use hooks for behavioral cross-cutting concerns and composition for structural ones.

```tsx
// Avoid: HOC for auth guard
const withAuth = <P extends object>(Component: React.ComponentType<P>) =>
  (props: P) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Redirect to="/login" />;
    return <Component {...props} />;
  };

// Prefer: hook + composition
const useRequireAuth = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);
  return isAuthenticated;
};

const ProtectedPage = () => {
  const isReady = useRequireAuth();
  if (!isReady) return null;
  return <PageContent />;
};
```
