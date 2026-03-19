/**
 * Perimeter Validation Configuration
 * 
 * Controls enforcement modes for schema validation at Inngest event boundaries.
 * Supports phased rollout with warn-only mode and per-event overrides.
 */

export type ValidationMode = "strict" | "warn" | "disabled";

export interface PerimeterValidationConfig {
  /** Global enforcement mode - can be overridden per event */
  globalMode: ValidationMode;
  
  /** Per-event enforcement overrides */
  eventOverrides: Record<string, ValidationMode>;
  
  /** Enable telemetry collection for validation outcomes */
  enableTelemetry: boolean;
}

/**
 * Derives validation configuration from environment variables
 */
export function getPerimeterValidationConfig(): PerimeterValidationConfig {
  // Global mode from ENFORCE_STRICT_SCHEMAS
  const enforceStrict = process.env.ENFORCE_STRICT_SCHEMAS?.toLowerCase();
  let globalMode: ValidationMode = "strict";
  
  if (enforceStrict === "false" || enforceStrict === "0") {
    globalMode = "disabled";
  } else if (enforceStrict === "warn") {
    globalMode = "warn";
  }
  
  // Per-event overrides from PERIMETER_VALIDATION_OVERRIDES
  // Format: "event1:mode1,event2:mode2"
  const overridesRaw = process.env.PERIMETER_VALIDATION_OVERRIDES || "";
  const eventOverrides: Record<string, ValidationMode> = {};
  
  if (overridesRaw) {
    for (const override of overridesRaw.split(",")) {
      const [eventName, mode] = override.split(":").map(s => s.trim());
      if (eventName && mode && ["strict", "warn", "disabled"].includes(mode)) {
        eventOverrides[eventName] = mode as ValidationMode;
      }
    }
  }
  
  return {
    globalMode,
    eventOverrides,
    enableTelemetry: process.env.PERIMETER_TELEMETRY_ENABLED !== "false",
  };
}

/**
 * Gets the effective validation mode for a specific event
 */
export function getValidationModeForEvent(eventName: string): ValidationMode {
  const config = getPerimeterValidationConfig();
  return config.eventOverrides[eventName] || config.globalMode;
}
