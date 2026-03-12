import { beforeEach, describe, expect, it, mock } from "bun:test";

const logWorkflowEventMock = mock(async () => undefined);

const workflowRow = {
	stage: 4,
	status: "processing",
	greenLaneRequestedAt: null as Date | null,
	greenLaneRequestedBy: null as string | null,
	greenLaneRequestNotes: null as string | null,
	greenLaneRequestSource: null as string | null,
	greenLaneConsumedAt: null as Date | null,
};

let pendingUpdate: Record<string, unknown> = {};

const selectWhereMock = mock(async () => [{ ...workflowRow }]);
const updateWhereMock = mock(async () => {
	Object.assign(workflowRow, pendingUpdate);
	return [];
});

const fakeDatabaseClient = {
	select: () => ({
		from: () => ({
			where: selectWhereMock,
		}),
	}),
	update: () => ({
		set: (values: Record<string, unknown>) => {
			pendingUpdate = values;
			return {
				where: updateWhereMock,
			};
		},
	}),
};

mock.module("@/app/utils", () => ({
	getBaseUrl: () => "http://localhost:3000",
	getDatabaseClient: () => fakeDatabaseClient,
}));

mock.module("@/lib/services/notification-events.service", () => ({
	logWorkflowEvent: logWorkflowEventMock,
}));

const { requestManualGreenLane } = await import("../lib/services/green-lane.service");

const baseWorkflowState = {
	stage: 4,
	status: "processing",
	greenLaneRequestedAt: null,
	greenLaneRequestedBy: null,
	greenLaneRequestNotes: null,
	greenLaneRequestSource: null,
	greenLaneConsumedAt: null,
};

describe("requestManualGreenLane", () => {
	beforeEach(() => {
		Object.assign(workflowRow, baseWorkflowState);
		pendingUpdate = {};
		selectWhereMock.mockClear();
		updateWhereMock.mockClear();
		logWorkflowEventMock.mockClear();
	});

	it("rejects when the workflow is completed", async () => {
		workflowRow.status = "completed";

		const result = await requestManualGreenLane(1, 2, "actor-1");

		expect(result.success).toBe(false);
		expect(result.disallowedState).toBe(true);
		expect(result.error).toBe(
			"Green Lane cannot be requested after the workflow is completed or terminated."
		);
		expect(updateWhereMock).not.toHaveBeenCalled();
		expect(logWorkflowEventMock).not.toHaveBeenCalled();
	});

	it("rejects when the workflow is past Stage 4", async () => {
		workflowRow.stage = 5;

		const result = await requestManualGreenLane(1, 2, "actor-1");

		expect(result.success).toBe(false);
		expect(result.disallowedState).toBe(true);
		expect(result.error).toBe("Green Lane is only available through Stage 4.");
		expect(updateWhereMock).not.toHaveBeenCalled();
		expect(logWorkflowEventMock).not.toHaveBeenCalled();
	});

	it("records a manual request when the workflow is active", async () => {
		const result = await requestManualGreenLane(1, 2, "actor-1", "needs bypass");

		expect(result.success).toBe(true);
		expect(workflowRow.greenLaneRequestedBy).toBe("actor-1");
		expect(workflowRow.greenLaneRequestNotes).toBe("needs bypass");
		expect(workflowRow.greenLaneRequestedAt).toBeInstanceOf(Date);
		expect(updateWhereMock).toHaveBeenCalledTimes(1);
		expect(logWorkflowEventMock).toHaveBeenCalledTimes(1);
	});
});
