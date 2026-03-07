import styles from "./external-form-theme.module.css";

interface ExternalStatusCardProps {
	title: string;
	description: string;
	variant?: "success" | "error";
}

export default function ExternalStatusCard({
	title,
	description,
	variant = "success",
}: ExternalStatusCardProps) {
	const isError = variant === "error";

	return (
		<div className={styles.successCard}>
			<div className={`${styles.statusIcon} ${isError ? styles.statusIconError : ""}`}>
				{isError ? (
					<svg
						className={styles.statusIconSvgError}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				) : (
					<svg
						className={styles.statusIconSvgSuccess}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				)}
			</div>
			<h2>{title}</h2>
			<p>{description}</p>
		</div>
	);
}
