# Self-Improvement Patch: Zod-to-JSON-Schema for Google GenAI Structured Output

**Date:** 2026-04-05
**Category:** AI Agent, Schema Validation, Google GenAI SDK
**Severity:** Critical — causes silent data corruption/loss in production workflows

## The Rule

**When using `@google/genai` SDK's `responseJsonSchema` config field, ALWAYS convert Zod schemas using `z.toJSONSchema(schema)` — NEVER pass a raw Zod schema directly.**

## Examples

❌ **Wrong:**

```typescript
const response = await client.models.generateContent({
  model: "gemini-2.5-flash",
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: MyZodSchema,  // WRONG: passes internal Zod metadata
  },
  contents: prompt,
});
```

✅ **Correct:**

```typescript
const response = await client.models.generateContent({
  model: "gemini-2.5-flash",
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(MyZodSchema),  // CORRECT: standard JSON Schema
  },
  contents: prompt,
});
```

## Why

The `@google/genai` SDK type for `responseJsonSchema` is `unknown`, which accepts any value — including a Zod schema object. However, the SDK serializes this value to the Gemini API as a JSON Schema definition. A raw Zod schema contains internal metadata (`_def`, `_type`, etc.) that is NOT valid JSON Schema. Result:

1. The Gemini API silently ignores the malformed schema
2. The model generates freeform JSON without structural constraints
3. Downstream `ZodSchema.parse()` fails with root-level type mismatches

## Detection

If you see Zod errors with `path: []` (empty path = root level) and `"expected object, received string"` after an AI call, check whether `responseJsonSchema` is using `z.toJSONSchema()`.

## Reference Implementation

See `lib/services/agents/financial-risk.agent.ts` line 199 and `lib/ai/models.ts` line 110 for the correct pattern.