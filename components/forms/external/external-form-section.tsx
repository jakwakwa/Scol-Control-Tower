import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./external-form-theme.module.css";

interface ExternalFormSectionProps {
	title: string;
	note?: string;
	children: React.ReactNode;
	bodyClassName?: string;
}

export default function ExternalFormSection({
	title,
	note,
	children,
	bodyClassName,
}: ExternalFormSectionProps) {
	return (
		<section className={styles.externalCard}>
			<div className={styles.externalSectionHeader}>{title}</div>
			<div className={cn(styles.externalSectionBody, bodyClassName)}>
				{note ? <p className={styles.externalSectionNote}>{note}</p> : null}
				{children}
			</div>
		</section>
	);
}
