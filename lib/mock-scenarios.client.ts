"use client";

import {
	isMockScenarioId,
	MOCK_SCENARIO_COOKIE_NAME,
	type MockScenarioId,
} from "@/lib/mock-scenarios";

export const MOCK_SCENARIO_STORAGE_KEY = "sc.mockScenario";
export const MOCK_SCENARIO_EVENT = "sc:mock-scenario-changed";

export function readClientMockScenarioId(): MockScenarioId | null {
	if (typeof window === "undefined") {
		return null;
	}

	const stored = window.localStorage.getItem(MOCK_SCENARIO_STORAGE_KEY);
	if (stored && isMockScenarioId(stored)) {
		return stored;
	}

	const cookieValue = document.cookie
		.split("; ")
		.find(value => value.startsWith(`${MOCK_SCENARIO_COOKIE_NAME}=`))
		?.split("=")[1];

	return cookieValue && isMockScenarioId(cookieValue) ? cookieValue : null;
}

export function writeClientMockScenarioId(scenarioId: MockScenarioId | null): void {
	if (typeof window === "undefined") {
		return;
	}

	if (scenarioId) {
		window.localStorage.setItem(MOCK_SCENARIO_STORAGE_KEY, scenarioId);
		document.cookie = `${MOCK_SCENARIO_COOKIE_NAME}=${scenarioId}; path=/; max-age=2592000; SameSite=Lax`;
	} else {
		window.localStorage.removeItem(MOCK_SCENARIO_STORAGE_KEY);
		document.cookie = `${MOCK_SCENARIO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
	}

	window.dispatchEvent(new CustomEvent(MOCK_SCENARIO_EVENT, { detail: { scenarioId } }));
}
