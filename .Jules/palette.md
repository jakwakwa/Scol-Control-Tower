## 2025-05-14 - Immediate Feedback on Debounced Clear Actions
**Learning:** When adding a "clear" action to a debounced search input, triggering the `onChange` callback immediately (bypassing the debounce) is crucial for the interface to feel responsive. If the clear action is also debounced, the user might see the input clear visually but see stale results for several hundred milliseconds, creating a "laggy" perception.
**Action:** Always call the `onChange` handler directly in the clear action's click handler, in addition to resetting the local state.
