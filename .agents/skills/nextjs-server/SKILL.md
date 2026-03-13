---
name: nextjs-server
description: Next.js Server Actions, API routes, Server Components, caching, parallel data fetching. Use this when working on backend logic, data fetching, or server-side caching in Next.js.
---

# Next.js Server

This skill provides guidelines and patterns for working efficiently with Next.js server-side features such as Server Actions, Server Components, caching mechanisms, and parallel data fetching.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Prevent Waterfall Chains in API Routes](async-api-routes.md)**: 2-10× improvement
- **[Defer Await Until Needed](async-defer-await.md)**: avoids blocking unused code paths
- **[Dependency-Based Parallelization](async-dependencies.md)**: 2-10× improvement
- **[Promise.all() for Independent Operations](async-parallel.md)**: 2-10× improvement
- **[Strategic Suspense Boundaries](async-suspense-boundaries.md)**: faster initial paint
- **[Use after() for Non-Blocking Operations](server-after-nonblocking.md)**: faster response times
- **[Authenticate Server Actions Like API Routes](server-auth-actions.md)**: prevents unauthorized access to server mutations
- **[Cross-Request LRU Caching](server-cache-lru.md)**: caches across requests
- **[Per-Request Deduplication with React.cache()](server-cache-react.md)**: deduplicates within request
- **[Avoid Duplicate Serialization in RSC Props](server-dedup-props.md)**: reduces network payload by avoiding duplicate serialization
- **[Hoist Static I/O to Module Level](server-hoist-static-io.md)**: avoids repeated file/network I/O per request
- **[Parallel Data Fetching with Component Composition](server-parallel-fetching.md)**: eliminates server-side waterfalls
- **[Minimize Serialization at RSC Boundaries](server-serialization.md)**: reduces data transfer size
