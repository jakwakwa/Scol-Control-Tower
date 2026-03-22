---
name: client-browser
description: Native DOM event listeners, LocalStorage, SWR, passive events. Use this when interacting directly with Browser APIs or native DOM elements.
---

# Client Browser

This skill provides the best practices for using native DOM APIs, caching strategies on the client (SWR, LocalStorage), and handling passive event listeners efficiently in React.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Deduplicate Global Event Listeners](client-event-listeners.md)**: single listener for N components
- **[Version and Minimize localStorage Data](client-localstorage-schema.md)**: prevents schema conflicts, reduces storage size
- **[Use Passive Event Listeners for Scrolling Performance](client-passive-event-listeners.md)**: eliminates scroll delay caused by event listeners
- **[Use SWR for Automatic Deduplication](client-swr-dedup.md)**: automatic deduplication
