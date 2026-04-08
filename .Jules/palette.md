## 2025-04-08 - [SearchInput Clear Button]
**Learning:** For debounced search inputs, a "Clear" action should immediately trigger the search callback to feel responsive, rather than waiting for the debounce timer.
**Action:** Implement a direct `onChange("")` call alongside `setText("")` when the clear button is clicked.
