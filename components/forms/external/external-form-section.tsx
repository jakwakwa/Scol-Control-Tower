import type React from "react";
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
}: ExternalFormSectionProps) {
	return (
		<section className="bg-transparent rounded-t-xl  px-0">
			<div className={styles.externalSectionHeader}>{title}</div>
			<div className="bg-white flex flex-col rounded-t-0 px-8 py-8 rounded-b-xl shadow-xl shadow-black/5 overflow-hidden">
				{note ? <p className={styles.externalSectionNote}>{note}</p> : null}
				{children}
			</div>
		</section>
	);
}
