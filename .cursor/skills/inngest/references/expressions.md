# Inngest expression syntax (CEL)

Inngest match expressions use a CEL-like syntax. In **`waitForEvent` `if` expressions** and similar:

- **`event`** — the **original** function trigger event (the run’s root event).
- **`async`** — the **incoming** event being matched against the wait.

## Common patterns

- Equality: `event.data.userId == async.data.userId`
- Combined: `event.data.userId == async.data.userId && async.data.plan == "pro"`
- Field paths: use dot notation from `data`, e.g. `event.data.orderId`, `async.data.status`.

## Operators

- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logic: `&&`, `||`, `!`
- Strings: double quotes for string literals

## Tips

- Keep expressions simple; push complex logic into event payloads or earlier steps.
- Always use timeouts on `waitForEvent` in production.

Official reference: [Inngest documentation](https://www.inngest.com/docs) (search for “expressions” or “waitForEvent”).
