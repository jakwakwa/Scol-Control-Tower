---
name: state-management
description: React Context, state lifting, derived state management. Use this when designing global state, complex Context boundaries, or deciding where state should live.
---

# State Management Architecture

This skill provides rules for correctly designing state boundaries, utilizing state lifting over global contexts where possible, and structuring standard Context API usage safely.

Please refer to the markdown files in this directory for detailed guidelines.

## Included Rules

- **[Define Generic Context Interfaces for Dependency Injection](state-context-interface.md)**: enables dependency-injectable state across use-cases
- **[Decouple State Management from UI](state-decouple-implementation.md)**: enables swapping state implementations without changing UI
- **[Lift State into Provider Components](state-lift-state.md)**: enables state sharing outside component boundaries
