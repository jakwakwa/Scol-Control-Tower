"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useMemo, useState } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import type { ZodTypeAny } from "zod";
import { Button } from "@/components/ui/button";
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
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to submit form";
			setSubmitError(message);
		}
	});

	const showTestButton = process.env.NEXT_PUBLIC_TEST_FORMS === "true" && testData;

	return (
		<FormProvider {...form}>
			<form onSubmit={handleSubmit} className="space-y-10">
				{showTestButton && (
					<div className="mb-6 p-4 border border-dashed border-yellow-500/50 bg-yellow-50/50 rounded-lg flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-yellow-800">Testing Mode Active</p>
							<p className="text-xs text-yellow-700">
								Click to autofill the form with test data.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => form.reset(testData)}
							className="bg-white border-yellow-200 hover:bg-yellow-50 hover:text-yellow-900 text-yellow-800">
							Autofill Form
						</Button>
					</div>
				)}
				{sectionLayouts.map(section => (
					<section key={section.title} className="space-y-6">
						<div className="space-y-1">
							<h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
							{section.description ? (
								<p className="text-sm text-muted-foreground">{section.description}</p>
							) : null}
						</div>
						<div
							className={`grid grid-cols-1 gap-6 ${
								section.columns === 2 ? "md:grid-cols-2" : ""
							}`}>
							{section.fields.map(field => {
								if (isRepeatable(field)) {
									return (
										<div key={field.name} className="md:col-span-2">
											<RepeatableFieldGroup field={field} />
										</div>
									);
								}

								return (
									<div
										key={field.name}
										className={field.colSpan === 2 ? "md:col-span-2" : ""}>
										<FormField field={field} />
									</div>
								);
							})}
						</div>
					</section>
				))}

				{submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

				<div className="flex items-center justify-end gap-3">
					{renderActions ? (
						renderActions
					) : (
						<Button type="submit" disabled={disabled || form.formState.isSubmitting}>
							{form.formState.isSubmitting ? "Submitting..." : submitLabel}
						</Button>
					)}
				</div>
			</form>
		</FormProvider>
	);
}
