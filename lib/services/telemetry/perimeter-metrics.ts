/**
 * Perimeter Validation Telemetry
 * 
 * Structured logging and metrics collection for perimeter validation outcomes.
 * Supports monitoring validation failures, payload violations, and rollout health.
 */

export interface PerimeterValidationMetric {
  eventName: string;
  sourceSystem: string;
  validationMode: "strict" | "warn" | "disabled";
  outcome: "success" | "warning" | "failure";
  failedPaths?: string[];
  messages?: string[];
  producer?: string;
  timestamp: string;
  workflowId?: number;
  applicantId?: number;
}

/**
 * Records a perimeter validation outcome for monitoring and alerting
 */
export function recordPerimeterValidationMetric(metric: PerimeterValidationMetric): void {
  // For now, use structured console logging
  // In production, this would integrate with Datadog, Sentry, or similar
  const logLevel = metric.outcome === "failure" ? "error" : 
                   metric.outcome === "warning" ? "warn" : "info";
  
  const logData = {
    metric: "perimeter_validation",
    ...metric,
    failedPathsCount: metric.failedPaths?.length || 0,
    messagesCount: metric.messages?.length || 0,
  };
  
  console[logLevel]("[PerimeterTelemetry]", JSON.stringify(logData));
  
  // TODO: Integrate with actual metrics backend
  // - Datadog: dogstatsd.increment('perimeter_validation_failures', 1, tags)
  // - Prometheus: perimeterValidationCounter.inc(labels)
  // - Custom: await metricsClient.record(metric)
}

/**
 * Records validation failure with detailed context
 */
export function recordValidationFailure(params: {
  eventName: string;
  sourceSystem: string;
  validationMode: "strict" | "warn";
  failedPaths: string[];
  messages: string[];
  producer?: string;
  workflowId?: number;
  applicantId?: number;
}): void {
  recordPerimeterValidationMetric({
    ...params,
    outcome: params.validationMode === "strict" ? "failure" : "warning",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Records successful validation
 */
export function recordValidationSuccess(params: {
  eventName: string;
  sourceSystem: string;
  validationMode: "strict" | "warn" | "disabled";
  producer?: string;
  workflowId?: number;
  applicantId?: number;
}): void {
  recordPerimeterValidationMetric({
    ...params,
    outcome: "success",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Extracts producer information from event context
 */
export function inferProducer(eventName: string, sourceSystem: string): string {
  // Map known event/source combinations to producer names
  const producerMap: Record<string, string> = {
    "onboarding/lead.created:control-tower": "internal-api",
    "sanctions/external.received:sanctions-ingress": "external-provider",
  };
  
  const key = `${eventName}:${sourceSystem}`;
  return producerMap[key] || `${sourceSystem}-unknown`;
}
