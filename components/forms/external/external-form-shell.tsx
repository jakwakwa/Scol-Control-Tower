import type React from "react";
import styles from "./external-form-theme.module.css";

interface ExternalFormShellProps {
	title: string;
	description?: string;
	children: React.ReactNode;
}

export default function ExternalFormShell({
	title,
	description,
	children,
}: ExternalFormShellProps) {
	return (
		<div className={styles.externalPage}>
			<header className={styles.externalHero}>
				<h1>{title}</h1>
				{description ? (
					<p className={styles.externalHeroDescription}>{description}</p>
				) : null}
			</header>
			{children}
		</div>
	);
}
