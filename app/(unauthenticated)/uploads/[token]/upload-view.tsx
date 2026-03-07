"use client";

import { useMemo, useState } from "react";
import styles from "@/components/forms/external/external-form-theme.module.css";
import type { DocumentRequirement } from "@/config/document-requirements";

interface UploadViewProps {
	token: string;
	requirements: DocumentRequirement[];
}

type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

export default function UploadView({ token, requirements }: UploadViewProps) {
	const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
	const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const grouped = useMemo(() => {
		return requirements.reduce<Record<string, DocumentRequirement[]>>((acc, req) => {
			const key = req.category;
			const group = acc[key] ?? [];
			group.push(req);
			acc[key] = group;
			return acc;
		}, {});
	}, [requirements]);

	const handleFilesChange = (type: string, files: FileList | null) => {
		if (!files) return;
		setSelectedFiles(prev => ({
			...prev,
			[type]: Array.from(files),
		}));
	};

	const uploadDocuments = async (requirement: DocumentRequirement) => {
		const files = selectedFiles[requirement.type] || [];
		if (files.length === 0) {
			setErrors(prev => ({
				...prev,
				[requirement.type]: "Please select at least one file.",
			}));
			return;
		}

		setStatuses(prev => ({ ...prev, [requirement.type]: "uploading" }));
		setErrors(prev => ({ ...prev, [requirement.type]: "" }));

		const formData = new FormData();
		formData.append("token", token);
		formData.append("documentType", requirement.type);
		formData.append("category", requirement.category);
		files.forEach(file => formData.append("files", file));

		const response = await fetch("/api/documents/upload", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const payload = await response.json().catch(() => ({}));
			setStatuses(prev => ({ ...prev, [requirement.type]: "error" }));
			setErrors(prev => ({
				...prev,
				[requirement.type]: payload?.error || "Upload failed",
			}));
			return;
		}

		setStatuses(prev => ({ ...prev, [requirement.type]: "uploaded" }));
	};

	return (
		<div className={styles.externalField}>
			<p className={styles.externalSectionNote}>
				Upload the supporting documents listed below. You can upload multiple files per
				requirement when needed.
			</p>

			{Object.entries(grouped).map(([category, items]) => (
				<section key={category} className={styles.externalCard}>
					<div className={styles.externalSectionHeader}>
						{category.replace(/_/g, " ")}
					</div>
					<div className={styles.externalSectionBody}>
						{items.map(req => (
							<div key={req.type} className={styles.ownerCard}>
								<div className="flex items-start justify-between gap-4">
									<div>
										<p>{req.label}</p>
										{req.description ? (
											<p className={styles.externalSectionNote}>{req.description}</p>
										) : null}
										<p className={styles.externalSectionNote}>
											{req.required ? "Required" : "Optional"}
										</p>
									</div>
									{statuses[req.type] === "uploaded" ? <span>Uploaded</span> : null}
								</div>
								<div className="flex flex-col gap-3 md:flex-row md:items-center">
									<input
										type="file"
										multiple
										onChange={event => handleFilesChange(req.type, event.target.files)}
										className={styles.externalInput}
									/>
									<button
										type="button"
										disabled={statuses[req.type] === "uploading"}
										className={styles.outlineButton}
										onClick={() => uploadDocuments(req)}>
										{statuses[req.type] === "uploading" ? "Uploading..." : "Upload"}
									</button>
								</div>
								{errors[req.type] ? (
									<p className={styles.externalError}>{errors[req.type]}</p>
								) : null}
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
