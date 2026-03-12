---
name: js-performance
description: Vanilla JavaScript optimizations, loops, caching, early exits, data structures. Use this when writing heavy computation logic, data processing, or general JS/TS algorithmic optimizations.
---

# JavaScript Performance

This skill contains rules for optimizing pure JavaScript and TypeScript execution, including data structures, loop optimizations, and computation caching.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Avoid Layout Thrashing](js-batch-dom-css.md)**: prevents forced synchronous layouts and reduces performance bottlenecks
- **[Cache Repeated Function Calls](js-cache-function-results.md)**: avoid redundant computation
- **[Cache Property Access in Loops](js-cache-property-access.md)**: reduces lookups
- **[Cache Storage API Calls](js-cache-storage.md)**: reduces expensive I/O
- **[Combine Multiple Array Iterations](js-combine-iterations.md)**: reduces iterations
- **[Early Return from Functions](js-early-exit.md)**: avoids unnecessary computation
- **[Hoist RegExp Creation](js-hoist-regexp.md)**: avoids recreation
- **[Build Index Maps for Repeated Lookups](js-index-maps.md)**: 1M ops to 2K ops
- **[Early Length Check for Array Comparisons](js-length-check-first.md)**: avoids expensive operations when lengths differ
- **[Use Loop for Min/Max Instead of Sort](js-min-max-loop.md)**: O(n) instead of O(n log n)
- **[Use Set/Map for O(1) Lookups](js-set-map-lookups.md)**: O(n) to O(1)
- **[Use toSorted() Instead of sort() for Immutability](js-tosorted-immutable.md)**: prevents mutation bugs in React state
