# Green Lane Automatic Approval Feature

## Overview

The Green Lane feature enables automatic approval of applicants who meet strict eligibility criteria, bypassing Stage 4 (Risk Manager manual review) in the onboarding workflow. This improves efficiency while maintaining full auditability.

## Eligibility Criteria

An applicant qualifies for Green Lane automatic approval when **all** of the following conditions are met:

| Criterion | Requirement | Description |
|-----------|-------------|-------------|
| **Aggregated Score** | ≥ 85% | The AI aggregated analysis score must be at least 85% |
| **Risk Level** | LOW ("green") | The applicant's risk level must be "green" (low risk) |
| **Flags** | Zero (0) | No risk flags from AI analysis |

If **any** criterion is not met, the applicant follows the standard manual review path.

## How It Works

### Workflow Integration

1. **Stage 3 (Enrichment)** completes with AI analysis results
2. **Stage 4 starts** and immediately evaluates Green Lane eligibility
3. If eligible:
   - Synthetic approval record is created with `approvedBy: "system_green_lane"`
   - Notification sent to internal team
   - Workflow proceeds directly to Stage 5 (Contract Review)
4. If not eligible:
   - Standard manual Risk Manager review process continues
   - No changes to existing workflow

### Synthetic Approval Records

When a Green Lane approval occurs, the system creates a fully auditable record:

```json
{
  "approvedBy": "system_green_lane",
  "approvedAt": "2026-03-12T10:30:00.000Z",
  "eligibilityResult": {
    "isEligible": true,
    "reasons": ["All Green Lane criteria met"],
    "criteria": {
      "scoreCheck": { "passed": true, "value": 90, "threshold": 85 },
      "riskLevelCheck": { "passed": true, "value": "green", "required": "green" },
      "flagsCheck": { "passed": true, "count": 0, "flags": [] }
    }
  },
  "workflowId": 123,
  "applicantId": 456
}
```

This record is stored in:
- `workflows.greenLaneApproval` (JSON text field)
- `workflow_events` table with `eventType: "green_lane_auto_approved"`

## Audit Trail

### Identifying Green Lane Approvals

#### Via Database

```sql
-- Find all Green Lane approved workflows
SELECT id, applicant_id, green_lane_approval 
FROM workflows 
WHERE green_lane_approval IS NOT NULL;

-- Find Green Lane events
SELECT * FROM workflow_events 
WHERE event_type IN ('green_lane_approval', 'green_lane_auto_approved');
```

#### Via UI

- Green Lane approved applicants display a distinctive badge in:
  - Risk Review queue
  - Applicant detail pages
  - Workflow timeline

### Approval Record Fields

| Field | Description |
|-------|-------------|
| `approvedBy` | Always `"system_green_lane"` for automated approvals |
| `approvedAt` | ISO 8601 timestamp of approval |
| `eligibilityResult.isEligible` | Always `true` for recorded approvals |
| `eligibilityResult.criteria.scoreCheck` | Score at time of evaluation |
| `eligibilityResult.criteria.riskLevelCheck` | Risk level at time of evaluation |
| `eligibilityResult.criteria.flagsCheck` | Flags count at time of evaluation |

## Configuration

### Constants

Located in `/lib/services/green-lane.service.ts`:

```typescript
export const GREEN_LANE_APPROVER_ID = "system_green_lane";
export const GREEN_LANE_SCORE_THRESHOLD = 85;
export const GREEN_LANE_RISK_LEVEL = "green";
```

### Modifying Thresholds

To adjust eligibility thresholds:

1. Update constants in `green-lane.service.ts`
2. Update tests in `tests/green-lane.test.ts`
3. Run `bun test` to verify
4. Deploy changes

**Note:** Changes to thresholds affect new applications only. Existing approvals retain their original eligibility data.

## API Reference

### Service Functions

| Function | Description |
|----------|-------------|
| `evaluateGreenLaneEligibility(input)` | Pure function to check eligibility |
| `processGreenLaneApproval(workflowId, applicantId, aiAnalysis)` | Full eligibility check + approval creation |
| `isGreenLaneApproved(workflowId)` | Check if a workflow was Green Lane approved |

### Events

| Event Type | Description |
|------------|-------------|
| `greenLane/approval.completed` | Emitted when Green Lane approval is recorded |
| `greenLane/eligibility.failed` | Emitted when eligibility check fails |

## Security Considerations

1. **No Manual Override**: Green Lane decisions cannot be manually triggered
2. **Immutable Records**: Approval records cannot be modified after creation
3. **Full Audit Trail**: All eligibility data is stored for compliance review
4. **Automatic Only**: Only the system can create `system_green_lane` approvals

## Troubleshooting

### Applicant Not Getting Green Lane Approved

Check the following:

1. **Score**: Verify `aiAnalysis.scores.aggregatedScore >= 85`
2. **Risk Level**: Verify `applicant.riskLevel === "green"`
3. **Flags**: Verify `aiAnalysis.overall.flags.length === 0`

Check workflow events for eligibility evaluation:
```sql
SELECT * FROM workflow_events 
WHERE workflow_id = ? 
AND event_type LIKE 'green_lane%'
ORDER BY timestamp DESC;
```

### Viewing Eligibility Details

For any workflow, the eligibility result (whether passed or failed) is logged:

```sql
SELECT payload FROM workflow_events 
WHERE workflow_id = ? 
AND event_type = 'green_lane_auto_approved';
```

## Testing

Run Green Lane tests:

```bash
bun test tests/green-lane.test.ts
```

## Changelog

- **v1.0.0** (2026-03-12): Initial Green Lane implementation
  - Eligibility criteria: score ≥ 85%, risk = "green", flags = 0
  - Synthetic approval with `approvedBy: "system_green_lane"`
  - UI indicators in risk review and applicant views
  - Full audit trail in `workflows.greenLaneApproval` and `workflow_events`
