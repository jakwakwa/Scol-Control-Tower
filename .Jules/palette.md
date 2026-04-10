## 2026-04-10 - Adding Clear Action to Debounced Search Input
**Learning:** When using debounced inputs, a "clear" action provides immediate UX feedback that the debounced logic would otherwise delay. Bypassing the debounce for the clear action makes the UI feel significantly more responsive.
**Action:** Always implement a manual clear button for debounced search fields and ensure it triggers the `onChange` callback immediately.
