import Image from "next/image";
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
				<Image
					src="/stratcol-corporate-logo-external.svg"
					alt="StratCol"
					width={160}
					height={54}
					className="h-auto w-auto mb-0"
					priority
				/>
				<div className={styles.externalHeroText}>
					<h1>{title}</h1>
					{description ? (
						<p className={styles.externalHeroDescription}>{description}</p>
					) : null}
				</div>
			</header>
			{children}
		</div>
	);
}
