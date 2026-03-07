"use client";

import { useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ExternalFormField from "./external/external-form-field";
import styles from "./external/external-form-theme.module.css";
import type { FieldDefinition, FieldOption } from "./types";

const fieldWrapperClasses = "flex flex-col gap-2";

const getOptionLabel = (option: FieldOption) => option.label;

const getOptionValue = (option: FieldOption) => option.value;

function FieldError({ name, external }: { name: string; external?: boolean }) {
	const {
		formState: { errors },
	} = useFormContext();

	const message = useMemo(() => {
		const parts = name.split(".");
		let current: unknown = errors;
		for (const part of parts) {
			if (!current || typeof current !== "object") return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		const error = current as { message?: string } | undefined;
		return error?.message;
	}, [errors, name]);

	if (!message) {
		return null;
	}

	return (
		<p className={external ? styles.externalError : "text-xs text-destructive"}>
			{message}
		</p>
	);
}

function CheckboxGroup({
	name,
	options = [],
	external = false,
}: {
	name: string;
	options: FieldOption[];
	external?: boolean;
}) {
	const { control } = useFormContext();

	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => {
				const value = Array.isArray(field.value) ? field.value : [];
				return (
					<div
						className={
							external ? styles.externalGrid : "grid grid-cols-1 gap-2 sm:grid-cols-2"
						}>
						{options.map(option => {
							const checked = value.includes(getOptionValue(option));
							const checkboxId = `${name}-${option.value}`;
							return (
								<div
									key={option.value}
									className={
										external
											? styles.entityType
											: "flex items-center gap-2 text-sm text-foreground"
									}>
									{external ? (
										<input
											id={checkboxId}
											type="checkbox"
											checked={checked}
											onChange={event => {
												const nextValue = event.target.checked
													? [...value, getOptionValue(option)]
													: value.filter(item => item !== getOptionValue(option));
												field.onChange(nextValue);
											}}
											aria-label={getOptionLabel(option)}
										/>
									) : (
										<Checkbox
											id={checkboxId}
											checked={checked}
											onCheckedChange={isChecked => {
												const nextValue = isChecked
													? [...value, getOptionValue(option)]
													: value.filter(item => item !== getOptionValue(option));
												field.onChange(nextValue);
											}}
											aria-label={getOptionLabel(option)}
										/>
									)}
									<span>{getOptionLabel(option)}</span>
								</div>
							);
						})}
					</div>
				);
			}}
		/>
	);
}

function SingleCheckbox({
	name,
	label,
	external = false,
}: {
	name: string;
	label: string;
	external?: boolean;
}) {
	const { control } = useFormContext();

	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) =>
				external ? (
					<div className={styles.consent}>
						<input
							id={name}
							type="checkbox"
							checked={!!field.value}
							onChange={event => field.onChange(event.target.checked)}
							aria-label={label}
						/>
						<label htmlFor={name}>{label}</label>
					</div>
				) : (
					<div className="flex items-center gap-2 text-sm text-foreground">
						<Checkbox
							id={name}
							checked={!!field.value}
							onCheckedChange={checked => field.onChange(!!checked)}
							aria-label={label}
						/>
						<span>{label}</span>
					</div>
				)
			}
		/>
	);
}

function SelectField({
	name,
	options = [],
	placeholder,
	external = false,
}: {
	name: string;
	options: FieldOption[];
	placeholder?: string;
	external?: boolean;
}) {
	const { register } = useFormContext();

	return (
		<select
			{...register(name)}
			className={
				external
					? styles.externalSelect
					: "flex h-10 w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm"
			}>
			<option value="">{placeholder || "Select an option"}</option>
			{options.map(option => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}

export function FormField({
	field,
	external = false,
}: {
	field: Exclude<FieldDefinition, { type: "repeatable" }>;
	external?: boolean;
}) {
	const { register } = useFormContext();

	if (field.type === "checkbox") {
		return (
			<div className={external ? styles.externalField : fieldWrapperClasses}>
				<SingleCheckbox name={field.name} label={field.label} external={external} />
				{field.description && (
					<p
						className={
							external ? styles.externalSectionNote : "text-xs text-muted-foreground"
						}>
						{field.description}
					</p>
				)}
				<FieldError name={field.name} external={external} />
			</div>
		);
	}

	if (field.type === "checkbox-group") {
		return (
			<div className={external ? styles.externalField : fieldWrapperClasses}>
				<ExternalFormField
					label={field.label}
					required={field.required}
					description={field.description}
					error={undefined}>
					<CheckboxGroup
						name={field.name}
						options={field.options || []}
						external={external}
					/>
				</ExternalFormField>
				<FieldError name={field.name} external={external} />
			</div>
		);
	}

	const inputClasses = cn(
		external ? styles.externalInput : "border-input-border",
		field.type === "signature" && "font-medium"
	);

	return external ? (
		<ExternalFormField
			label={field.label}
			required={field.required}
			description={field.description}
			error={undefined}>
			{field.type === "textarea" ? (
				<textarea
					id={field.name}
					{...register(field.name)}
					placeholder={field.placeholder}
					className={styles.externalTextarea}
				/>
			) : field.type === "select" ? (
				<SelectField
					name={field.name}
					options={field.options || []}
					placeholder={field.placeholder}
					external
				/>
			) : (
				<input
					id={field.name}
					type={field.type === "signature" ? "text" : field.type}
					{...register(field.name)}
					placeholder={field.placeholder}
					className={inputClasses}
				/>
			)}
			<FieldError name={field.name} external />
		</ExternalFormField>
	) : (
		<div className={fieldWrapperClasses}>
			<label className="text-sm font-medium text-foreground" htmlFor={field.name}>
				{field.label}
				{field.required ? " *" : ""}
			</label>
			{field.description && (
				<p className="text-xs text-muted-foreground">{field.description}</p>
			)}
			{field.type === "textarea" ? (
				<textarea
					id={field.name}
					{...register(field.name)}
					placeholder={field.placeholder}
					className="border-input bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-none rounded-xl border px-3 py-3 text-base transition-colors focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>
			) : field.type === "select" ? (
				<SelectField
					name={field.name}
					options={field.options || []}
					placeholder={field.placeholder}
				/>
			) : (
				<input
					id={field.name}
					type={field.type === "signature" ? "text" : field.type}
					{...register(field.name)}
					placeholder={field.placeholder}
					className={cn(
						"border-input-border flex h-9 w-full rounded-xl border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none",
						field.type === "signature" && "font-medium"
					)}
				/>
			)}
			<FieldError name={field.name} />
		</div>
	);
}

export function RepeatableFieldGroup({
	field,
	external = false,
}: {
	field: Extract<FieldDefinition, { type: "repeatable" }>;
	external?: boolean;
}) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: field.name,
	});

	return (
		<div className={external ? styles.externalField : "flex flex-col gap-4"}>
			<div
				className={
					external ? styles.externalActions : "flex items-center justify-between"
				}>
				<div>
					<p className={external ? "" : "text-sm font-medium text-foreground"}>
						{field.label}
					</p>
					{field.minItems ? (
						<p
							className={
								external ? styles.externalSectionNote : "text-xs text-muted-foreground"
							}>
							Minimum {field.minItems}
						</p>
					) : null}
				</div>
				<button
					type="button"
					className={external ? styles.addButton : "text-sm font-medium text-primary"}
					onClick={() => append({})}>
					{field.addLabel || "Add another"}
				</button>
			</div>
			<div className={external ? styles.historyList : "space-y-4"}>
				{fields.map((item, index) => (
					<div
						key={item.id}
						className={
							external
								? styles.ownerCard
								: "rounded-lg border border-border/60 p-4 space-y-4"
						}>
						<div className="flex items-center justify-between">
							<p
								className={
									external
										? styles.externalSectionNote
										: "text-xs font-semibold uppercase text-muted-foreground"
								}>
								Entry {index + 1}
							</p>
							{fields.length > (field.minItems || 0) ? (
								<button
									type="button"
									className={
										external ? styles.ownerRemove : "text-xs font-medium text-destructive"
									}
									onClick={() => remove(index)}>
									Remove
								</button>
							) : null}
						</div>
						<div
							className={
								external ? styles.externalGrid : "grid grid-cols-1 gap-4 md:grid-cols-2"
							}>
							{field.fields.map(subField => (
								<FormField
									key={`${field.name}.${index}.${subField.name}`}
									field={{
										...subField,
										name: `${field.name}.${index}.${subField.name}`,
									}}
									external={external}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
