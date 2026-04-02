## Web UX Rules — Full Detail

### 1. WCAG 2.1 AA compliance is mandatory

All user-facing features must meet WCAG 2.1 Level AA success criteria. This includes color contrast ratios (4.5:1 for normal text, 3:1 for large text), text resizing up to 200%, and content reflow at 320px viewport width. Test with axe, Lighthouse, and manual keyboard/screen-reader testing.

### 2. Use semantic HTML elements

Use `<button>` for actions, `<a>` for navigation, `<nav>` for navigation landmarks, `<main>` for primary content, `<header>`/`<footer>` for page structure, `<section>` with headings for content groups, and `<form>` for input groups. Never use `<div>` or `<span>` with click handlers when a native element exists.

```tsx
// Wrong
<div onClick={handleSubmit}>Submit</div>

// Right
<button type="submit" onClick={handleSubmit}>Submit</button>
```

### 3. ARIA is a last resort

Use ARIA attributes only when no native HTML element provides the required semantics. When using ARIA, follow the five rules: use native elements first, don't change native semantics, all interactive ARIA elements must be keyboard operable, don't use `role="presentation"` or `aria-hidden="true"` on focusable elements, and all interactive elements must have accessible names.

### 4. Keyboard navigation for all interactive elements

Every button, link, input, dropdown, modal, and custom widget must be reachable and operable with keyboard alone (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys). Test by unplugging your mouse and navigating the entire feature.

### 5. Manage focus on route changes

When navigating between pages in a SPA, move focus to the main content heading or a skip-navigation target. Announce the new page title to screen readers. Use a focus management utility or router integration.

```tsx
// After navigation, move focus to the page heading
useEffect(() => {
  headingRef.current?.focus();
}, [pathname]);
```

### 6. Dark mode via CSS custom properties

Define all colors as CSS custom properties on `:root` and override them in a `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)` block. Never maintain separate light/dark stylesheets. Ensure all color pairs meet contrast ratios in both themes.

```css
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
}
[data-theme='dark'] {
  --color-bg: #1a1a1a;
  --color-text: #f0f0f0;
}
```

### 7. Responsive design with mobile-first breakpoints

Write base styles for the smallest viewport and layer on complexity with `min-width` media queries. Standard breakpoints: 480px (small), 768px (medium), 1024px (large), 1280px (extra-large). Use relative units (`rem`, `em`, `%`, `vw`) over fixed `px` where possible.

```css
/* Base: mobile */
.card {
  padding: 1rem;
}

/* Medium and up */
@media (min-width: 768px) {
  .card {
    padding: 2rem;
  }
}
```

### 8. Include a skip-navigation link

The first focusable element on every page must be a "Skip to main content" link that jumps to the `<main>` element. It may be visually hidden until focused.

```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
<main id="main-content">...</main>
```

### 9. Provide alt text for all images

Meaningful images must have descriptive `alt` text. Decorative images must have `alt=""` (empty string) so screen readers skip them. Never use `alt` text like "image" or "photo" — describe the content or function.

```tsx
// Meaningful image
<img src="chart.png" alt="Bar chart showing 40% growth in Q3 2024" />

// Decorative image
<img src="divider.png" alt="" />
```

### 10. Label every form input

Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>` with a `for`/`htmlFor` attribute matching the input's `id`. Placeholder text is not a substitute for a label. Group related inputs with `<fieldset>` and `<legend>`.

```tsx
<label htmlFor="email">Email address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

### 11. Link error messages to inputs

Validation errors must be programmatically associated with their input using `aria-describedby` or `aria-errormessage`. Error text must be visible, specific ("Email must include an @ symbol"), and announced by screen readers when the input receives focus.

```tsx
<input id="email" type="email" aria-describedby="email-error" aria-invalid={hasError} />;
{
  hasError && (
    <span id="email-error" role="alert">
      Email must include an @ symbol.
    </span>
  );
}
```

### 12. Respect `prefers-reduced-motion`

Wrap all animations and transitions in a `@media (prefers-reduced-motion: no-preference)` query. Users who prefer reduced motion should see instant state changes, not animated ones. Essential motion (e.g., a loading spinner) may persist but should be minimized.

```css
@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 200ms ease;
  }
}
```

### 13. Minimum touch target size of 44×44px

All interactive elements (buttons, links, checkboxes, toggles) must have a minimum tap area of 44×44 CSS pixels. Use padding to increase the target size without changing the visual size of the element.

```css
.icon-button {
  /* Visual size: 24px icon */
  padding: 10px; /* Total tap area: 44×44px */
}
```

### 14. Color is never the only indicator

Do not rely on color alone to convey information (error states, status, required fields). Always pair color with an icon, text label, or pattern. This ensures usability for color-blind users.

```tsx
// Wrong: red color alone signals error
<span style={{ color: "red" }}>{value}</span>

// Right: icon + color + text
<span className="error">
  <ErrorIcon aria-hidden="true" /> {value} (invalid)
</span>
```

### 15. Focus indicators must be visible

Never remove the browser's default focus outline without providing a custom one. Custom focus styles must have at least 3:1 contrast against the background and be clearly visible in both light and dark themes.

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

### 16. Use `aria-live` regions for dynamic content

Content that updates without a page reload (toast notifications, form validation, chat messages) must be wrapped in an `aria-live` region (`polite` for non-urgent, `assertive` for critical) so screen readers announce the change.

```tsx
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### 17. Test with real assistive technology

Automated tools catch ~30% of accessibility issues. Test every feature with at least one screen reader (VoiceOver on macOS, NVDA on Windows) and verify the experience is equivalent to the visual one.
