"use client";

/**
 * FormWizard Component
 * A multi-step form wizard with step navigation and draft persistence
 * Note: Using UK spelling throughout (e.g., colour, centre, organisation)
 */

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	RiArrowLeftLine,
	RiArrowRightLine,
	RiCheckLine,
	RiSaveLine,
	RiLoader4Line,
} from "@remixicon/react";

export interface FormWizardStep {
	id: string;
	title: string;
	description?: string;
	/** Optional validation function for the step */
	validate?: () => Promise<boolean> | boolean;
	/** Whether this step is optional */
	optional?: boolean;
	/** Whether to skip this step based on form data */
	shouldSkip?: () => boolean;
}

export interface FormWizardProps {
	/** Array of step definitions */
	steps: FormWizardStep[];
	/** Current step index (controlled) */
	currentStep?: number;
	/** Callback when step changes */
	onStepChange?: (step: number) => void;
	/** Callback when form is submitted */
	onSubmit: () => Promise<void> | void;
	/** Callback to save draft */
	onSaveDraft?: () => Promise<void> | void;
	/** Children render function receiving current step */
	children: (props: {
		currentStep: number;
		/** Original step index in the unfiltered `steps` array (matches FormWizardStep order) */
		logicalStepIndex: number;
		isFirstStep: boolean;
		isLastStep: boolean;
		goToStep: (step: number) => void;
	}) => React.ReactNode;
	/** Storage key for draft persistence */
	storageKey?: string;
	/** Form title */
	title?: string;
	/** Whether the form is loading */
	isLoading?: boolean;
	/** Whether the form is submitting */
	isSubmitting?: boolean;
	/** Additional class names */
	className?: string;
	/** Whether to show step indicator */
	showStepIndicator?: boolean;
	/** Custom submit button text */
	submitButtonText?: string;
}

/**
 * Read a persisted wizard step index, clamped to [0, maxActiveSteps - 1].
 * Use when the parent owns controlled step state (initial `useState` only).
 */
export function readPersistedWizardStep(
	storageKey: string | undefined,
	maxActiveSteps: number
): number {
	if (typeof window === "undefined" || !storageKey || maxActiveSteps < 1) return 0;
	const saved = localStorage.getItem(`${storageKey}_step`);
	if (!saved) return 0;
	const step = Number.parseInt(saved, 10);
	if (Number.isNaN(step) || step < 0) return 0;
	return Math.min(step, maxActiveSteps - 1);
}

function readPersistedStepForSteps(
	storageKey: string | undefined,
	steps: FormWizardStep[]
): number {
	const activeLen = steps.filter(s => !s.shouldSkip?.()).length;
	return readPersistedWizardStep(storageKey, activeLen);
}

interface StepIndicatorProps {
	steps: FormWizardStep[];
	currentStep: number;
	onStepClick?: (step: number) => void;
	className?: string;
}

export function StepIndicator({
	steps,
	currentStep,
	onStepClick,
	className,
}: StepIndicatorProps) {
	return (
		<div className={cn("flex items-center justify-center gap-1", className)}>
			{steps.map((step, index) => {
				const isCompleted = index < currentStep;
				const isCurrent = index === currentStep;
				const isClickable = onStepClick && index <= currentStep;

				return (
					<React.Fragment key={step.id}>
						<button
							type="button"
							onClick={() => isClickable && onStepClick?.(index)}
							disabled={!isClickable}
							className={cn(
								"flex items-center justify-center rounded-full font-medium transition-all",
								"h-8 w-8 text-xs",
								isCompleted && "bg-teal-500/40 text-teal-700",
								isCurrent && "bg-stone-500/20 text-stone-400 ring-2 ring-stone-500/30",
								!(isCompleted || isCurrent ) && "bg-muted text-muted-foreground",
								isClickable && "cursor-pointer hover:opacity-80",
								!isClickable && "cursor-default"
							)}
							title={step.title}>
							{isCompleted ? <RiCheckLine className="h-4 w-4" /> : index + 1}
						</button>

						{index < steps.length - 1 && (
							<div
								className={cn(
									"h-0.5 w-6 transition-colors",
									index < currentStep ? "bg-teal-500/40" : "bg-muted"
								)}
							/>
						)}
					</React.Fragment>
				);
			})}
		</div>
	);
}

interface StepTitlesProps {
	steps: FormWizardStep[];
	currentStep: number;
	className?: string;
}

export function StepTitles({ steps, currentStep, className }: StepTitlesProps) {
	const currentStepData = steps[currentStep];

	return (
		<div className={cn("text-center", className)}>
			<p className="text-xs text-muted-foreground uppercase tracking-wider">
				Step {currentStep + 1} of {steps.length}
			</p>
			<h3 className="text-lg font-semibold text-foreground mt-1">
				{currentStepData?.title}
			</h3>
			{currentStepData?.description && (
				<p className="text-sm text-muted-foreground mt-1">
					{currentStepData.description}
				</p>
			)}
		</div>
	);
}

export function FormWizard({
	steps,
	currentStep: controlledStep,
	onStepChange,
	onSubmit,
	onSaveDraft,
	children,
	storageKey,
	title,
	isLoading = false,
	isSubmitting = false,
	className,
	showStepIndicator = true,
	submitButtonText = "Submit",
}: FormWizardProps) {
	// Uncontrolled: lazy restore from steps. Controlled: parent hydrates via readPersistedWizardStep (avoids save-effect loops).
	const [internalStep, setInternalStep] = useState(() =>
		controlledStep !== undefined ? 0 : readPersistedStepForSteps(storageKey, steps)
	);
	const currentStep = controlledStep ?? internalStep;

	const [isSavingDraft, setIsSavingDraft] = useState(false);

	const activeSteps = steps.filter(step => !step.shouldSkip?.());

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === activeSteps.length - 1;

	const activeStepMeta = activeSteps[currentStep];
	const logicalStepIndex =
		activeStepMeta !== undefined ? steps.findIndex(s => s.id === activeStepMeta.id) : 0;

	useEffect(() => {
		if (controlledStep !== undefined) return;
		if (activeSteps.length < 1) return;
		if (internalStep >= activeSteps.length) {
			setInternalStep(Math.max(0, activeSteps.length - 1));
		}
	}, [activeSteps.length, controlledStep, internalStep]);

	useEffect(() => {
		if (controlledStep === undefined) return;
		if (activeSteps.length < 1) return;
		if (controlledStep >= activeSteps.length) {
			onStepChange?.(Math.max(0, activeSteps.length - 1));
		}
	}, [activeSteps.length, controlledStep, onStepChange]);

	useEffect(() => {
		if (storageKey && typeof window !== "undefined") {
			localStorage.setItem(`${storageKey}_step`, currentStep.toString());
		}
	}, [currentStep, storageKey]);

	const goToStep = useCallback(
		(step: number) => {
			if (step >= 0 && step < activeSteps.length) {
				if (controlledStep === undefined) {
					setInternalStep(step);
				}
				onStepChange?.(step);
				if (typeof window !== "undefined") {
					window.scrollTo({ top: 0, behavior: "smooth" });
				}
			}
		},
		[activeSteps.length, controlledStep, onStepChange]
	);

	const goToNext = useCallback(async () => {
		const step = activeSteps[currentStep];

		if (step?.validate) {
			const isValid = await step.validate();
			if (!isValid) return;
		}

		if (!isLastStep) {
			goToStep(currentStep + 1);
		}
	}, [currentStep, activeSteps, isLastStep, goToStep]);

	const goToPrevious = useCallback(() => {
		if (!isFirstStep) {
			goToStep(currentStep - 1);
		}
	}, [currentStep, isFirstStep, goToStep]);

	const handleSubmit = useCallback(async () => {
		const step = activeSteps[currentStep];

		if (step?.validate) {
			const isValid = await step.validate();
			if (!isValid) return;
		}

		await onSubmit();

		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}

		if (storageKey && typeof window !== "undefined") {
			localStorage.removeItem(`${storageKey}_step`);
		}
	}, [currentStep, activeSteps, onSubmit, storageKey]);

	const handleSaveDraft = useCallback(async () => {
		if (!onSaveDraft) return;

		setIsSavingDraft(true);
		try {
			await onSaveDraft();
		} finally {
			setIsSavingDraft(false);
		}
	}, [onSaveDraft]);

	return (
		<Card className={cn("w-full", className)}>
			{/* Header */}
			{(title || showStepIndicator) && (
				<CardHeader className="space-y-4">
					{title && (
						<CardTitle className="text-xl font-bold text-center">{title}</CardTitle>
					)}

					{showStepIndicator && (
						<>
							<StepIndicator
								steps={activeSteps}
								currentStep={currentStep}
								onStepClick={goToStep}
							/>
							<StepTitles steps={activeSteps} currentStep={currentStep} />
						</>
					)}
				</CardHeader>
			)}

			{/* Content */}
			<CardContent className="pt-0">
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					children({
						currentStep,
						logicalStepIndex,
						isFirstStep,
						isLastStep,
						goToStep,
					})
				)}
			</CardContent>

			{/* Footer with navigation */}
			<CardFooter className="flex items-center justify-between border-t border-border pt-6">
				<div className="flex items-center gap-2">
					{/* Previous button */}
					<Button
						type="button"
						variant="ghost"
						onClick={goToPrevious}
						disabled={isFirstStep || isLoading || isSubmitting}
						className="gap-1.5">
						<RiArrowLeftLine className="h-4 w-4" />
						Previous
					</Button>
				</div>

				<div className="flex items-center gap-2">
					{/* Save draft button */}
					{onSaveDraft && (
						<Button
							type="button"
							variant="outline"
							onClick={handleSaveDraft}
							disabled={isLoading || isSubmitting || isSavingDraft}
							className="gap-1.5">
							{isSavingDraft ? (
								<RiLoader4Line className="h-4 w-4 animate-spin" />
							) : (
								<RiSaveLine className="h-4 w-4" />
							)}
							Save Draft
						</Button>
					)}

					{/* Next/Submit button */}
					{isLastStep ? (
						<Button
							type="button"
							onClick={handleSubmit}
							disabled={isLoading || isSubmitting}
							className="gap-1.5">
							{isSubmitting ? (
								<RiLoader4Line className="h-4 w-4 animate-spin" />
							) : (
								<RiCheckLine className="h-4 w-4" />
							)}
							{submitButtonText}
						</Button>
					) : (
						<Button
							type="button"
							onClick={goToNext}
							disabled={isLoading || isSubmitting}
							className="gap-1.5">
							Next
							<RiArrowRightLine className="h-4 w-4" />
						</Button>
					)}
				</div>
			</CardFooter>
		</Card>
	);
}

interface FormStepProps {
	/** Whether this step is active */
	isActive: boolean;
	/** Step content */
	children: React.ReactNode;
	/** Additional class names */
	className?: string;
}

export function FormStep({ isActive, children, className }: FormStepProps) {
	if (!isActive) return null;

	return (
		<div className={cn("animate-in fade-in-50 duration-300", className)}>{children}</div>
	);
}
