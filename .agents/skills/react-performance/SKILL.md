---
name: react-performance
description: React rendering, re-rendering optimizations, memoization, hydration patterns. Use this when debugging performance issues, optimizing components, or fixing unnecessary React re-renders.
---

# React Performance

This skill contains advanced rules and patterns for optimizing React applications, preventing unnecessary re-renders, and handling hydration efficiently.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Use Activity Component for Show/Hide](rendering-activity.md)**: preserves state/DOM
- **[Animate SVG Wrapper Instead of SVG Element](rendering-animate-svg-wrapper.md)**: enables hardware acceleration
- **[Use Explicit Conditional Rendering](rendering-conditional-render.md)**: prevents rendering 0 or NaN
- **[CSS content-visibility for Long Lists](rendering-content-visibility.md)**: faster initial render
- **[Hoist Static JSX Elements](rendering-hoist-jsx.md)**: avoids re-creation
- **[Prevent Hydration Mismatch Without Flickering](rendering-hydration-no-flicker.md)**: avoids visual flicker and hydration errors
- **[Suppress Expected Hydration Mismatches](rendering-hydration-suppress-warning.md)**: avoids noisy hydration warnings for known differences
- **[Optimize SVG Precision](rendering-svg-precision.md)**: reduces file size
- **[Use useTransition Over Manual Loading States](rendering-usetransition-loading.md)**: reduces re-renders and improves code clarity
- **[Defer State Reads to Usage Point](rerender-defer-reads.md)**: avoids unnecessary subscriptions
- **[Narrow Effect Dependencies](rerender-dependencies.md)**: minimizes effect re-runs
- **[Calculate Derived State During Rendering](rerender-derived-state-no-effect.md)**: avoids redundant renders and state drift
- **[Subscribe to Derived State](rerender-derived-state.md)**: reduces re-render frequency
- **[Use Functional setState Updates](rerender-functional-setstate.md)**: prevents stale closures and unnecessary callback recreations
- **[Use Lazy State Initialization](rerender-lazy-state-init.md)**: wasted computation on every render
- **[Extract Default Non-primitive Parameter Value from Memoized Component to Constant](rerender-memo-with-default-value.md)**: restores memoization by using a constant for default value
- **[Extract to Memoized Components](rerender-memo.md)**: enables early returns
- **[Put Interaction Logic in Event Handlers](rerender-move-effect-to-event.md)**: avoids effect re-runs and duplicate side effects
- **[Do not wrap a simple expression with a primitive result type in useMemo](rerender-simple-expression-in-memo.md)**: wasted computation on every render
- **[Use Transitions for Non-Urgent Updates](rerender-transitions.md)**: maintains UI responsiveness
- **[Use useRef for Transient Values](rerender-use-ref-transient-values.md)**: avoids unnecessary re-renders on frequent updates
