import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./external-form-theme.module.css";

interface ExternalFormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	className?: string;
	children: React.ReactNode;
	description?: string;
}

export default function ExternalFormField({
	label,
	required,
	error,
	className,
	children,
	description,
}: ExternalFormFieldProps) {
	return (
		<div className={cn(styles.externalField, className)}>
			<label>
				{label}
				{required ? <span className={styles.requiredStar}>*</span> : null}
			</label>
			{description ? <p className={styles.externalSectionNote}>{description}</p> : null}
			{children}
			{error ? <span className={styles.externalError}>{error}</span> : null}
		</div>
	);
}
