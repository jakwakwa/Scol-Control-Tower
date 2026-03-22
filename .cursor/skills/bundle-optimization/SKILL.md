---
name: bundle-optimization
description: Dynamic imports, tree shaking, third-party script loading optimization. Use this when optimizing application load time or modifying module imports.
---

# Bundle Optimization

This skill provides guidelines and patterns for minimizing the JavaScript bundle size, utilizing dynamic imports, and deferring third-party scripts efficiently.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Avoid Barrel File Imports](bundle-barrel-imports.md)**: 200-800ms import cost, slow builds
- **[Conditional Module Loading](bundle-conditional.md)**: loads large data only when needed
- **[Defer Non-Critical Third-Party Libraries](bundle-defer-third-party.md)**: loads after hydration
- **[Dynamic Imports for Heavy Components](bundle-dynamic-imports.md)**: directly affects TTI and LCP
- **[Preload Based on User Intent](bundle-preload.md)**: reduces perceived latency
