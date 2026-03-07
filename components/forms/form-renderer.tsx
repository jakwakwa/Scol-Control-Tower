"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useMemo, useState } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import type { ZodTypeAny } from "zod";
import ExternalFormSection from "./external/external-form-section";
import styles from "./external/external-form-theme.module.css";
import { FormField, RepeatableFieldGroup } from "./form-fields";
import type { FieldDefinition, FormSectionDefinition } from "./types";

interface FormRendererProps {
	sections: FormSectionDefinition[];
	schema: ZodTypeAny;
	defaultValues?: Record<string, unknown>;
	testData?: Record<string, unknown>;
	submitLabel?: string;
	onSubmit: (values: FieldValues) => Promise<void>;
	disabled?: boolean;
	renderActions?: ReactNode;
}

const isRepeatable = (
	field: FieldDefinition
): field is Extract<FieldDefinition, { type: "repeatable" }> =>
	field.type === "repeatable";

export default function FormRenderer({
	sections,
	schema,
	defaultValues,
	testData,
	submitLabel = "Submit",
	onSubmit,
	disabled,
	renderActions,
}: FormRendererProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm<FieldValues>({
		resolver: zodResolver(schema) as Resolver<FieldValues>,
		defaultValues,
	});

	const sectionLayouts = useMemo(
		() =>
			sections.map(section => ({
				...section,
				columns: section.columns ?? 2,
			})),
		[sections]
	);

	const handleSubmit = form.handleSubmit(async values => {
		setSubmitError(null);
		try {
			await onSubmit(values);
			// Scroll to top so users see success messages
			if (typeof window !== "undefined") {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to submit form";
			setSubmitError(message);
			// Scroll to top so users see error messages
			if (typeof window !== "undefined") {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
		}
	});

	const showTestButton = process.env.NEXT_PUBLIC_TEST_FORMS === "true" && testData;

	return (
		<FormProvider {...form}>
			<form onSubmit={handleSubmit} className="space-y-10">
				{showTestButton && (
					<div className={styles.testingBanner}>
						<div className="space-y-1">
							<p className={styles.testingTitle}>Testing Mode Active</p>
							<p className={styles.testingText}>
								Click to autofill the form with test data.
							</p>
						</div>
						<button
							type="button"
							onClick={() => form.reset(testData)}
							className={styles.outlineButton}>
							Autofill Form
						</button>
					</div>
				)}
				{sectionLayouts.map(section => (
					<ExternalFormSection
						key={section.title}
						title={section.title}
						note={section.description || undefined}>
						<div
							className={
								section.columns === 2 ? styles.externalGrid : "grid grid-cols-1 gap-6"
							}>
							{section.fields.map(field => {
								if (isRepeatable(field)) {
									return (
										<div key={field.name} className={styles.externalFieldFull}>
											<RepeatableFieldGroup field={field} external />
										</div>
									);
								}

								return (
									<div
										key={field.name}
										className={field.colSpan === 2 ? styles.externalFieldFull : ""}>
										<FormField field={field} external />
									</div>
								);
							})}
						</div>
					</ExternalFormSection>
				))}

				{submitError ? <p className={styles.errorBanner}>{submitError}</p> : null}

				<div className={styles.externalActions}>
					{renderActions ? (
						renderActions
					) : (
						<button
							type="submit"
							disabled={disabled || form.formState.isSubmitting}
							className={styles.primaryButton}>
							{form.formState.isSubmitting ? "Submitting..." : submitLabel}
						</button>
					)}
				</div>
			</form>
		</FormProvider>
	);
}
