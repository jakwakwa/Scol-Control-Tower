---
name: advanced-react
description: Advanced hooks, ref handling, React 19 patterns. Use this when dealing with complex React refs, closures, or upgrading to React 19 paradigms.
---

# Advanced React Themes

This skill contains advanced rules on safely utilizing the latest React APIs (like `useEffectEvent`), working with strict callback refs, and avoiding ref or effect anti-patterns.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Store Event Handlers in Refs](advanced-event-handler-refs.md)**: stable subscriptions
- **[Initialize App Once, Not Per Mount](advanced-init-once.md)**: avoids duplicate init in development
- **[useEffectEvent for Stable Callback Refs](advanced-use-latest.md)**: prevents effect re-runs
- **[React 19 API Changes](react19-no-forwardref.md)**: cleaner component definitions and context usage
