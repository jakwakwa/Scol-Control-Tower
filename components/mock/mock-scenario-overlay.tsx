"use client";

import { RiFlaskLine, RiPlayCircleLine } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	getMockScenarioDefinition,
	MOCK_SCENARIOS,
	type MockScenarioId,
} from "@/lib/mock-scenarios";
import {
	MOCK_SCENARIO_EVENT,
	readClientMockScenarioId,
	writeClientMockScenarioId,
} from "@/lib/mock-scenarios.client";

export function MockScenarioOverlay({
	hasPreviewBanner = false,
}: {
	hasPreviewBanner?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [activeScenarioId, setActiveScenarioId] = useState<MockScenarioId | null>(null);
	const [isMockEnvironment, setIsMockEnvironment] = useState(false);

	useEffect(() => {
		setIsMockEnvironment(document.body.dataset.mockEnvironment === "true");
		setActiveScenarioId(readClientMockScenarioId());

		const onScenarioChange = () => {
			setActiveScenarioId(readClientMockScenarioId());
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen(current => !current);
			}
		};

		window.addEventListener(MOCK_SCENARIO_EVENT, onScenarioChange as EventListener);
		window.addEventListener("storage", onScenarioChange);
		window.addEventListener("keydown", onKeyDown);

		return () => {
			window.removeEventListener(MOCK_SCENARIO_EVENT, onScenarioChange as EventListener);
			window.removeEventListener("storage", onScenarioChange);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	const activeScenario = useMemo(
		() => getMockScenarioDefinition(activeScenarioId),
		[activeScenarioId]
	);

	if (!isMockEnvironment) {
		return null;
	}

	return (
		<>
			{activeScenario && (
				<div
					className={`fixed ${hasPreviewBanner ? "bottom-0" : "bottom-3"} z-90 w-[44vw] border-b flex left-[30%]  right-[20%] border-amber-100/10 bg-black/15 rounded-xl px-2 	py-3 inline-flex justify-center align-center py-1 text-amber-200/80 shadow-sm backdrop-blur-[4px]`}>
					<div className=" text-center w-full   gap-3 text-sm">
						<div className="min-w--full w-full">
							<p className="text-[11px] opacity-90">
								⚠️ Keep this scenario active until its workflow completed. Clear it after
								completion before selecting another scenario.
							</p>
						</div>
					</div>
				</div>
			)}
			<div className="fixed bottom-3 right-5 z-100 flex items-center gap-2 rounded-full border border-border/10 bg-zinc-950/80 px-3 py-2 shadow-lg backdrop-blur-sm">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<RiFlaskLine className="animate-bounce size-4 text-amber-500" />
					<span>{activeScenario?.label ?? "Seeded snapshots only"}</span>
				</div>
				<Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
					<RiPlayCircleLine className="size-4" />
					Scenario
				</Button>
			</div>

			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="Mock Scenario Runner"
				description={
					activeScenario
						? "Clear the active scenario after it finishes before choosing another one."
						: "Choose the active manual-testing scenario for the next workflow."
				}>
				<Command>
					<CommandInput placeholder="Search scenarios..." />
					<CommandList>
						<CommandEmpty>No scenario matches your search.</CommandEmpty>
						<CommandGroup heading="Workflow Scenarios">
							{Object.values(MOCK_SCENARIOS).map(scenario => (
								<CommandItem
									key={scenario.id}
									value={`${scenario.label} ${scenario.description}`}
									checked={activeScenarioId === scenario.id}
									disabled={Boolean(activeScenarioId && activeScenarioId !== scenario.id)}
									onSelect={() => {
										writeClientMockScenarioId(scenario.id);
										setOpen(false);
									}}>
									<div className="flex min-w-0 flex-col">
										<span className="font-medium text-foreground">{scenario.label}</span>
										<span className="text-xs text-muted-foreground">
											{scenario.description}
											{scenario.lockedEntityType
												? ` Locked to ${scenario.lockedEntityType.replaceAll("_", " ")}.`
												: ""}
										</span>
									</div>
								</CommandItem>
							))}
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup heading="Utilities">
							<CommandItem
								value="Clear scenario"
								onSelect={() => {
									writeClientMockScenarioId(null);
									setOpen(false);
								}}>
								<div className="flex min-w-0 flex-col">
									<span className="font-medium text-foreground">Clear Scenario</span>
									<span className="text-xs text-muted-foreground">
										Return to the existing seeded-manual-testing snapshots.
									</span>
								</div>
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	);
}
