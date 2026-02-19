"use client";

import { useCallback, useState } from "react";

/**
 * Kitchen sink page to preview all magic link forms.
 * Dev-only — generates test tokens and opens forms in new tabs.
 */

interface FormEntry {
	type: string;
	title: string;
	description: string;
	route: string;
	sections: number;
	color: string;
}

const FORMS: FormEntry[] = [
	{
		type: "FACILITY_APPLICATION",
		title: "Facility Application",
		description: "Product configuration and volume details for facility preparation.",
		route: "/forms",
		sections: 4,
		color: "#3b82f6",
	},
	{
		type: "SIGNED_QUOTATION",
		title: "Signed Quotation",
		description: "Quotation acceptance with fee acknowledgement and signature.",
		route: "/forms",
		sections: 1,
		color: "#8b5cf6",
	},
	{
		type: "STRATCOL_CONTRACT",
		title: "StratCol Contract",
		description:
			"Branded agreement form matching the PDF — entity details, banking, beneficial owners, declaration.",
		route: "/contract",
		sections: 6,
		color: "#c9a356",
	},
	{
		type: "ABSA_6995",
		title: "Absa 6995 Pre-screening",
		description:
			"Comprehensive user pre-screening assessment with applicant, banking, ratios, and declarations.",
		route: "/forms",
		sections: 12,
		color: "#ef4444",
	},
	{
		type: "ACCOUNTANT_LETTER",
		title: "Accounting Officer Letter",
		description: "Confirmation of accounting officer details and business information.",
		route: "/forms",
		sections: 3,
		color: "#10b981",
	},
	{
		type: "CALL_CENTRE_APPLICATION",
		title: "Call Centre Application",
		description:
			"Service agreement, product description, contact info, and call scripts.",
		route: "/forms",
		sections: 4,
		color: "#f59e0b",
	},
	{
		type: "DOCUMENT_UPLOADS",
		title: "Document Uploads",
		description: "File upload form for supporting documents (uses separate upload UI).",
		route: "/uploads",
		sections: 0,
		color: "#6b7280",
	},
];

interface GeneratedLink {
	type: string;
	url: string;
	token: string;
}

export default function DevFormsPage() {
	const [loading, setLoading] = useState<string | null>(null);
	const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
	const [error, setError] = useState<string | null>(null);

	const generateToken = useCallback(async (formType: string) => {
		setLoading(formType);
		setError(null);

		try {
			const res = await fetch("/api/dev/forms/generate-token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ formType }),
			});

			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to generate token");
			}

			const data = await res.json();
			const link: GeneratedLink = {
				type: formType,
				url: data.url,
				token: data.token,
			};

			setGeneratedLinks(prev => [link, ...prev]);

			// Open in new tab
			window.open(data.url, "_blank");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate token");
		} finally {
			setLoading(null);
		}
	}, []);

	return (
		<div style={styles.page}>
			<div style={styles.container}>
				{/* Header */}
				<div style={styles.header}>
					<div style={styles.headerBadge}>DEV ONLY</div>
					<h1 style={styles.title}>Forms Kitchen Sink</h1>
					<p style={styles.subtitle}>
						Generate magic link tokens and preview all form types. Each click creates a
						fresh token and opens the form in a new tab.
					</p>
				</div>

				{error && <div style={styles.errorBanner}>{error}</div>}

				{/* Form grid */}
				<div style={styles.grid}>
					{FORMS.map(form => (
						<div key={form.type} style={styles.card}>
							<div style={{ ...styles.cardAccent, background: form.color }} />
							<div style={styles.cardBody}>
								<div style={styles.cardTop}>
									<h2 style={styles.cardTitle}>{form.title}</h2>
									<span
										style={{
											...styles.badge,
											background: `${form.color}18`,
											color: form.color,
										}}>
										{form.type}
									</span>
								</div>
								<p style={styles.cardDesc}>{form.description}</p>
								<div style={styles.cardMeta}>
									<span>
										Route: <code style={styles.code}>{form.route}/[token]</code>
									</span>
									{form.sections > 0 && <span>{form.sections} sections</span>}
								</div>
								<button
									onClick={() => generateToken(form.type)}
									disabled={loading === form.type}
									style={{
										...styles.generateBtn,
										background: form.color,
										opacity: loading === form.type ? 0.6 : 1,
									}}>
									{loading === form.type ? "Generating…" : "Generate & Open →"}
								</button>
							</div>
						</div>
					))}
				</div>

				{/* Generated links history */}
				{generatedLinks.length > 0 && (
					<div style={styles.historySection}>
						<h3 style={styles.historyTitle}>Generated Links</h3>
						<div style={styles.historyList}>
							{generatedLinks.map((link, i) => {
								const form = FORMS.find(f => f.type === link.type);
								return (
									<div key={`${link.token}-${i}`} style={styles.historyItem}>
										<div
											style={{
												...styles.historyDot,
												background: form?.color || "#6b7280",
											}}
										/>
										<div style={styles.historyInfo}>
											<span style={styles.historyType}>{form?.title}</span>
											<a
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												style={styles.historyLink}>
												{link.url}
											</a>
										</div>
										<code style={styles.historyToken}>{link.token.slice(0, 12)}…</code>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Footer */}
				<div style={styles.footer}>
					This page is only available in development mode. Forms require a valid database
					connection to generate tokens.
				</div>
			</div>
		</div>
	);
}

/* ── Inline styles ── */

const styles: Record<string, React.CSSProperties> = {
	page: {
		minHeight: "100vh",
		background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
		padding: "2rem 1rem",
	},
	container: {
		maxWidth: 1100,
		margin: "0 auto",
	},
	header: {
		textAlign: "center" as const,
		marginBottom: "2.5rem",
	},
	headerBadge: {
		display: "inline-block",
		background: "linear-gradient(90deg, #f59e0b, #ef4444)",
		color: "white",
		fontSize: "0.65rem",
		fontWeight: 800,
		letterSpacing: "0.15em",
		padding: "0.2rem 0.75rem",
		borderRadius: "9999px",
		marginBottom: "0.75rem",
	},
	title: {
		fontSize: "2rem",
		fontWeight: 800,
		color: "white",
		letterSpacing: "-0.02em",
		margin: "0.5rem 0",
	},
	subtitle: {
		fontSize: "0.9rem",
		color: "#94a3b8",
		maxWidth: 600,
		margin: "0 auto",
		lineHeight: 1.6,
	},
	errorBanner: {
		background: "#fef2f2",
		border: "1px solid #fecaca",
		borderRadius: 8,
		padding: "0.75rem 1rem",
		fontSize: "0.8rem",
		color: "#dc2626",
		marginBottom: "1.5rem",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
		gap: "1.25rem",
	},
	card: {
		background: "#1e293b",
		borderRadius: 12,
		overflow: "hidden",
		border: "1px solid #334155",
		transition: "border-color 0.15s",
	},
	cardAccent: {
		height: 3,
	},
	cardBody: {
		padding: "1.25rem",
	},
	cardTop: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: "0.5rem",
		marginBottom: "0.5rem",
	},
	cardTitle: {
		fontSize: "1rem",
		fontWeight: 700,
		color: "white",
		margin: 0,
	},
	badge: {
		fontSize: "0.6rem",
		fontWeight: 700,
		padding: "0.15rem 0.5rem",
		borderRadius: 4,
		whiteSpace: "nowrap" as const,
		flexShrink: 0,
	},
	cardDesc: {
		fontSize: "0.8rem",
		color: "#94a3b8",
		lineHeight: 1.5,
		margin: "0.5rem 0",
	},
	cardMeta: {
		display: "flex",
		gap: "1rem",
		fontSize: "0.7rem",
		color: "#64748b",
		marginBottom: "0.75rem",
	},
	code: {
		background: "#0f172a",
		padding: "0.1rem 0.4rem",
		borderRadius: 4,
		fontSize: "0.65rem",
		fontFamily: "monospace",
		color: "#94a3b8",
	},
	generateBtn: {
		width: "100%",
		color: "white",
		fontWeight: 700,
		fontSize: "0.8rem",
		padding: "0.6rem 1rem",
		borderRadius: 8,
		border: "none",
		cursor: "pointer",
		transition: "opacity 0.15s, transform 0.1s",
	},
	historySection: {
		marginTop: "2.5rem",
		background: "#1e293b",
		borderRadius: 12,
		border: "1px solid #334155",
		padding: "1.25rem",
	},
	historyTitle: {
		fontSize: "0.9rem",
		fontWeight: 700,
		color: "white",
		margin: "0 0 0.75rem",
	},
	historyList: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "0.5rem",
	},
	historyItem: {
		display: "flex",
		alignItems: "center",
		gap: "0.75rem",
		background: "#0f172a",
		borderRadius: 8,
		padding: "0.5rem 0.75rem",
	},
	historyDot: {
		width: 8,
		height: 8,
		borderRadius: "50%",
		flexShrink: 0,
	},
	historyInfo: {
		flex: 1,
		display: "flex",
		flexDirection: "column" as const,
		gap: "0.15rem",
	},
	historyType: {
		fontSize: "0.75rem",
		fontWeight: 600,
		color: "white",
	},
	historyLink: {
		fontSize: "0.7rem",
		color: "#60a5fa",
		textDecoration: "none",
	},
	historyToken: {
		fontSize: "0.6rem",
		color: "#64748b",
		background: "#1e293b",
		padding: "0.15rem 0.4rem",
		borderRadius: 4,
		fontFamily: "monospace",
	},
	footer: {
		textAlign: "center" as const,
		marginTop: "2rem",
		fontSize: "0.7rem",
		color: "#475569",
	},
};
