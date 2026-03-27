"use client";

import { useCallback, useState } from "react";
import ExternalFormShell from "@/components/forms/external/external-form-shell";
import styles from "@/components/forms/external/external-form-theme.module.css";

/**
 * Dev-only — External magic linked forms for dev testing only! generates test tokens and opens forms in new tabs.
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
		type: "AGREEMENT_CONTRACT",
		title: "StratCol Contract",
		description:
			"Branded agreement form matching the PDF — entity details, banking, beneficial owners, declaration.",
		route: "/agreement",
		sections: 6,
		color: "#c9a356",
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
		<div className="min-h-screen  min-w-screen m-0 p-0">
			<ExternalFormShell
				title="Forms Kitchen Sink"
				description="Generate magic link tokens and preview all form types. Each click creates a fresh token and opens the form in a new tab.">
				{error ? <div className={styles.errorBanner}>{error}</div> : null}

				<section className="bg-transparent rounded-xl flex flex-col gap-3 overflow-hidden mx-4">
					<div className={styles.externalSectionHeader}>DEV ONLY</div>
					<div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{FORMS.map(form => (
								<div key={form.type} className={styles.ownerCard}>
									<div className="mb-3 flex items-start justify-between gap-3">
										<p className="font-semibold">{form.title}</p>
										<span className={styles.externalSectionNote}>{form.type}</span>
									</div>
									<p className={styles.externalSectionNote}>{form.description}</p>
									<div className="mb-3 flex items-center justify-between gap-3">
										<code className={styles.externalSectionNote}>
											{form.route}/[token]
										</code>
										{form.sections > 0 ? (
											<span className={styles.externalSectionNote}>
												{form.sections} sections
											</span>
										) : null}
									</div>
									<button
										type="button"
										onClick={() => generateToken(form.type)}
										disabled={loading === form.type}
										className={styles.primaryButton}>
										{loading === form.type ? "Generating..." : "Generate & Open"}
									</button>
								</div>
							))}
						</div>
					</div>
				</section>

				{generatedLinks.length > 0 ? (
					<section className="">
						<div className={styles.externalSectionHeader}>Generated Links</div>
						<div>
							<div className={styles.historyList}>
								{generatedLinks.map((link, i) => {
									const form = FORMS.find(item => item.type === link.type);
									return (
										<div key={`${link.token}-${i}`} className={styles.historyItem}>
											<div
												className="h-2 w-2 rounded-full"
												style={{ background: form?.color || "#6b7280" }}
											/>
											<div className="flex-1">
												<p>{form?.title || link.type}</p>
												<a
													href={link.url}
													target="_blank"
													rel="noopener noreferrer"
													className={styles.externalSectionNote}>
													{link.url}
												</a>
											</div>
											<code className={styles.externalSectionNote}>
												{link.token.slice(0, 12)}...
											</code>
										</div>
									);
								})}
							</div>
						</div>
					</section>
				) : null}

				<p className={styles.externalSectionNote}>
					This page is only available in development mode. Forms require a valid database
					connection to generate tokens.
				</p>
			</ExternalFormShell>
		</div>
	);
}
