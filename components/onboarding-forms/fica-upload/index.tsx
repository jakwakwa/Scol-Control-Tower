"use client";

/**
 * FICA Document Upload Form
 * Category-driven checklist for required document uploads
 * Note: Using UK spelling throughout (e.g., organisation, authorisation)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
	RiAddLine,
	RiBankLine,
	RiBriefcaseLine,
	RiCheckLine,
	RiCloseLine,
	RiDeleteBinLine,
	RiFileTextLine,
	RiFolderLine,
	RiGovernmentLine,
	RiUploadCloud2Line,
	RiUserLine,
} from "@remixicon/react";
import * as React from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	DOCUMENT_REQUIREMENTS,
	DocumentCategory,
	FICA_DOCUMENTS_STEP_TITLES,
	type FicaDocumentsFormData,
	ficaDocumentsSchema,
	getFicaDocumentsDefaultValues,
} from "@/lib/validations/onboarding";
import { FormStep, FormWizard } from "../form-wizard";

// ============================================
// Types
// ============================================

interface FicaUploadFormProps {
	/** Workflow ID */
	workflowId: number;
	/** Initial form data for editing */
	initialData?: Partial<FicaDocumentsFormData>;
	/** Callback on successful submission */
	onSubmit: (data: FicaDocumentsFormData) => Promise<void>;
	/** Callback to save draft */
	onSaveDraft?: (data: Partial<FicaDocumentsFormData>) => Promise<void>;
	/** Callback when a file is uploaded */
	onFileUpload?: (
		file: File,
		documentType: string
	) => Promise<{ uploadId: string; url: string }>;
	/** Whether the form is in read-only mode */
	readOnly?: boolean;
	/** Directors/beneficial owners for individual documents */
	individuals?: Array<{
		name: string;
		role: "director" | "beneficial_owner" | "authorised_representative";
	}>;
	/** External submitting state */
	isSubmitting?: boolean;
}

// ============================================
// Document Upload Item Component
// ============================================

interface DocumentUploadItemProps {
	label: string;
	description?: string;
	required?: boolean;
	isUploaded: boolean;
	fileName?: string;
	acceptedFormats: string[];
	maxSizeMb: number;
	onUpload: (file: File) => void;
	onRemove: () => void;
	disabled?: boolean;
	error?: string;
}

function DocumentUploadItem({
	label,
	description,
	required,
	isUploaded,
	fileName,
	acceptedFormats,
	maxSizeMb,
	onUpload,
	onRemove,
	disabled,
	error,
}: DocumentUploadItemProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleClick = () => {
		if (!disabled && inputRef.current) {
			inputRef.current.click();
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			onUpload(file);
		}
	};

	const acceptString = acceptedFormats.map(f => `.${f}`).join(",");

	return (
		<div
			className={cn(
				"p-4 rounded-lg border transition-colors",
				isUploaded ? "border-teal-500/50 bg-teal-500/5" : "border-border",
				error && "border-destructive bg-destructive/5"
			)}>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<Label className="text-sm font-medium">
							{label}
							{required && <span className="text-destructive ml-1">*</span>}
						</Label>
						{isUploaded && (
							<Badge variant="success" className="gap-1">
								<RiCheckLine className="h-3 w-3" />
								Uploaded
							</Badge>
						)}
					</div>
					{description && (
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					)}
					<p className="text-xs text-muted-foreground mt-1">
						Accepted: {acceptedFormats.join(", ").toUpperCase()} | Max: {maxSizeMb}MB
					</p>
					{isUploaded && fileName && (
						<p className="text-xs text-foreground mt-2 flex items-center gap-1">
							<RiFileTextLine className="h-3 w-3" />
							{fileName}
						</p>
					)}
					{error && <p className="text-xs text-destructive mt-1">{error}</p>}
				</div>

				<div className="flex items-center gap-2">
					<input
						ref={inputRef}
						type="file"
						accept={acceptString}
						onChange={handleChange}
						className="hidden"
						disabled={disabled}
					/>

					{isUploaded ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onRemove}
							disabled={disabled}
							className="text-destructive hover:text-destructive">
							<RiCloseLine className="h-4 w-4" />
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleClick}
							disabled={disabled}
							className="gap-1.5">
							<RiUploadCloud2Line className="h-4 w-4" />
							Upload
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

// ============================================
// Category Icons
// ============================================

const _CATEGORY_ICONS = {
	[DocumentCategory.STANDARD]: RiFolderLine,
	[DocumentCategory.INDIVIDUAL]: RiUserLine,
	[DocumentCategory.FINANCIAL]: RiBankLine,
	[DocumentCategory.PROFESSIONAL]: RiBriefcaseLine,
	[DocumentCategory.INDUSTRY]: RiGovernmentLine,
};

// ============================================
// Main Form Component
// ============================================

export function FicaUploadForm({
	workflowId,
	initialData,
	onSubmit,
	onSaveDraft,
	onFileUpload,
	readOnly = false,
	individuals = [],
	isSubmitting: externalIsSubmitting = false,
}: FicaUploadFormProps) {
	const [currentStep, setCurrentStep] = React.useState(0);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [uploadingDoc, setUploadingDoc] = React.useState<string | null>(null);

	const methods = useForm<FicaDocumentsFormData>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(ficaDocumentsSchema) as any,
		defaultValues: initialData ?? getFicaDocumentsDefaultValues(),
		mode: "onBlur",
	});

	const {
		handleSubmit,
		control,
		formState: { errors },
		watch,
		setValue,
	} = methods;

	// Individual documents field array
	const {
		fields: individualDocs,
		append: addIndividualDoc,
		remove: removeIndividualDoc,
	} = useFieldArray({
		control,
		name: "individual.documents",
	});

	// Form steps configuration
	const steps = FICA_DOCUMENTS_STEP_TITLES.map((title, index) => ({
		id: `step-${index + 1}`,
		title,
	}));

	// Handle form submission
	const handleFormSubmit = async (data: FicaDocumentsFormData) => {
		setIsSubmitting(true);
		try {
			await onSubmit(data);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle save draft
	const handleSaveDraft = async () => {
		if (onSaveDraft) {
			await onSaveDraft(methods.getValues());
		}
	};

	// Handle file upload
	const handleFileUpload = async (
		file: File,
		documentType: string,
		fieldPath: string
	) => {
		if (!onFileUpload) {
			// Mock upload for demo
			setValue(`${fieldPath}.isUploaded` as any, true);
			setValue(`${fieldPath}.fileName` as any, file.name);
			setValue(`${fieldPath}.fileSize` as any, file.size);
			setValue(`${fieldPath}.mimeType` as any, file.type);
			return;
		}

		setUploadingDoc(documentType);
		try {
			const result = await onFileUpload(file, documentType);
			setValue(`${fieldPath}.isUploaded` as any, true);
			setValue(`${fieldPath}.fileName` as any, file.name);
			setValue(`${fieldPath}.fileSize` as any, file.size);
			setValue(`${fieldPath}.mimeType` as any, file.type);
			setValue(`${fieldPath}.uploadId` as any, result.uploadId);
		} finally {
			setUploadingDoc(null);
		}
	};

	// Handle file remove
	const handleFileRemove = (fieldPath: string) => {
		setValue(`${fieldPath}.isUploaded` as any, false);
		setValue(`${fieldPath}.fileName` as any, undefined);
		setValue(`${fieldPath}.fileSize` as any, undefined);
		setValue(`${fieldPath}.uploadId` as any, undefined);
	};

	// Get documents by category
	const _getDocumentsByCategory = (category: string) =>
		DOCUMENT_REQUIREMENTS.filter(doc => doc.category === category);

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(handleFormSubmit)}>
				<FormWizard
					steps={steps}
					currentStep={currentStep}
					onStepChange={setCurrentStep}
					onSubmit={handleSubmit(handleFormSubmit)}
					onSaveDraft={onSaveDraft ? handleSaveDraft : undefined}
					title="FICA & Support Documents"
					isSubmitting={isSubmitting || externalIsSubmitting}
					storageKey={`fica-documents-${workflowId}`}
					submitButtonText="Submit Documents">
					{({ currentStep }) => (
						<>
							{/* Step 1: Standard Documents */}
							<FormStep isActive={currentStep === 0}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiFolderLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Standard Documents</h3>
									</div>

									<div className="space-y-4">
										<DocumentUploadItem
											label="CIPC Registration"
											description="Company registration documents from CIPC"
											required
											isUploaded={watch("standard.cipcRegistration.isUploaded") ?? false}
											fileName={watch("standard.cipcRegistration.fileName")}
											acceptedFormats={["pdf", "jpg", "png"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"cipc_registration",
													"standard.cipcRegistration"
												)
											}
											onRemove={() => handleFileRemove("standard.cipcRegistration")}
											disabled={readOnly || uploadingDoc === "cipc_registration"}
										/>

										<DocumentUploadItem
											label="Tax Clearance Certificate"
											description="Valid SARS tax clearance certificate"
											isUploaded={watch("standard.taxClearance.isUploaded") ?? false}
											fileName={watch("standard.taxClearance.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={5}
											onUpload={file =>
												handleFileUpload(file, "tax_clearance", "standard.taxClearance")
											}
											onRemove={() => handleFileRemove("standard.taxClearance")}
											disabled={readOnly || uploadingDoc === "tax_clearance"}
										/>

										<DocumentUploadItem
											label="VAT Registration"
											description="VAT registration certificate if applicable"
											isUploaded={watch("standard.vatRegistration.isUploaded") ?? false}
											fileName={watch("standard.vatRegistration.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={5}
											onUpload={file =>
												handleFileUpload(
													file,
													"vat_registration",
													"standard.vatRegistration"
												)
											}
											onRemove={() => handleFileRemove("standard.vatRegistration")}
											disabled={readOnly || uploadingDoc === "vat_registration"}
										/>

										<DocumentUploadItem
											label="Website/Service Description"
											description="Description of your website and services offered"
											required
											isUploaded={
												watch("standard.websiteDescription.isUploaded") ?? false
											}
											fileName={watch("standard.websiteDescription.fileName")}
											acceptedFormats={["pdf", "doc", "docx"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"website_description",
													"standard.websiteDescription"
												)
											}
											onRemove={() => handleFileRemove("standard.websiteDescription")}
											disabled={readOnly || uploadingDoc === "website_description"}
										/>
									</div>
								</div>
							</FormStep>

							{/* Step 2: Individual Documents */}
							<FormStep isActive={currentStep === 1}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiUserLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Individual Documents</h3>
									</div>

									<p className="text-sm text-muted-foreground">
										Upload ID copies and proof of residence for each director and
										beneficial owner. Documents must not be older than 3 months.
									</p>

									{!readOnly && (
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												addIndividualDoc({
													personName: "",
													personRole: "director",
													idDocument: {
														documentType: "director_id",
														isUploaded: false,
													},
													proofOfResidence: {
														documentType: "proof_of_residence",
														isUploaded: false,
													},
												})
											}
											className="gap-1.5">
											<RiAddLine className="h-4 w-4" />
											Add Person
										</Button>
									)}

									<div className="space-y-6">
										{individualDocs.map((field, index) => (
											<div
												key={field.id}
												className="p-4 rounded-lg border border-border space-y-4">
												<div className="flex items-center justify-between">
													<div className="grid grid-cols-2 gap-4 flex-1">
														<div className="space-y-2">
															<Label className="text-sm font-medium">Person Name</Label>
															<Input
																{...methods.register(
																	`individual.documents.${index}.personName`
																)}
																placeholder="Full name"
																disabled={readOnly}
															/>
														</div>
														<div className="space-y-2">
															<Label className="text-sm font-medium">Role</Label>
															<select
																{...methods.register(
																	`individual.documents.${index}.personRole`
																)}
																className="flex h-9 w-full rounded-lg border border-input bg-input/10 px-3 py-1 text-sm"
																disabled={readOnly}>
																<option value="director">Director</option>
																<option value="beneficial_owner">Beneficial Owner</option>
																<option value="authorised_representative">
																	Authorised Representative
																</option>
															</select>
														</div>
													</div>

													{!readOnly && individualDocs.length > 1 && (
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => removeIndividualDoc(index)}
															className="h-8 w-8 text-destructive ml-4">
															<RiDeleteBinLine className="h-4 w-4" />
														</Button>
													)}
												</div>

												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<DocumentUploadItem
														label="ID Document"
														description="Certified copy of ID"
														required
														isUploaded={
															watch(
																`individual.documents.${index}.idDocument.isUploaded`
															) ?? false
														}
														fileName={watch(
															`individual.documents.${index}.idDocument.fileName`
														)}
														acceptedFormats={["pdf", "jpg", "png"]}
														maxSizeMb={5}
														onUpload={file =>
															handleFileUpload(
																file,
																`individual_id_${index}`,
																`individual.documents.${index}.idDocument`
															)
														}
														onRemove={() =>
															handleFileRemove(`individual.documents.${index}.idDocument`)
														}
														disabled={readOnly}
													/>

													<DocumentUploadItem
														label="Proof of Residence"
														description="Not older than 3 months"
														required
														isUploaded={
															watch(
																`individual.documents.${index}.proofOfResidence.isUploaded`
															) ?? false
														}
														fileName={watch(
															`individual.documents.${index}.proofOfResidence.fileName`
														)}
														acceptedFormats={["pdf", "jpg", "png"]}
														maxSizeMb={5}
														onUpload={file =>
															handleFileUpload(
																file,
																`individual_por_${index}`,
																`individual.documents.${index}.proofOfResidence`
															)
														}
														onRemove={() =>
															handleFileRemove(
																`individual.documents.${index}.proofOfResidence`
															)
														}
														disabled={readOnly}
													/>
												</div>
											</div>
										))}

										{individualDocs.length === 0 && (
											<p className="text-sm text-muted-foreground text-center py-8">
												No individuals added. Click "Add Person" to add directors and
												beneficial owners.
											</p>
										)}
									</div>
								</div>
							</FormStep>

							{/* Step 3: Financial Documents */}
							<FormStep isActive={currentStep === 2}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBankLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Financial Documents</h3>
									</div>

									<p className="text-sm text-muted-foreground">
										Upload the latest 3 months of bank statements for the account where
										funds will be credited.
									</p>

									<div className="space-y-4">
										<DocumentUploadItem
											label="Bank Statement - Month 1"
											description="Most recent statement"
											required
											isUploaded={
												watch("financial.bankStatementMonth1.isUploaded") ?? false
											}
											fileName={watch("financial.bankStatementMonth1.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"bankStatementMonth1",
													"financial.bankStatementMonth1"
												)
											}
											onRemove={() => handleFileRemove("financial.bankStatementMonth1")}
											disabled={readOnly || uploadingDoc === "bankStatementMonth1"}
										/>
										<DocumentUploadItem
											label="Bank Statement - Month 2"
											description="Second most recent statement"
											required
											isUploaded={
												watch("financial.bankStatementMonth2.isUploaded") ?? false
											}
											fileName={watch("financial.bankStatementMonth2.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"bankStatementMonth2",
													"financial.bankStatementMonth2"
												)
											}
											onRemove={() => handleFileRemove("financial.bankStatementMonth2")}
											disabled={readOnly || uploadingDoc === "bankStatementMonth2"}
										/>
										<DocumentUploadItem
											label="Bank Statement - Month 3"
											description="Third most recent statement"
											required
											isUploaded={
												watch("financial.bankStatementMonth3.isUploaded") ?? false
											}
											fileName={watch("financial.bankStatementMonth3.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"bankStatementMonth3",
													"financial.bankStatementMonth3"
												)
											}
											onRemove={() => handleFileRemove("financial.bankStatementMonth3")}
											disabled={readOnly || uploadingDoc === "bankStatementMonth3"}
										/>
									</div>
								</div>
							</FormStep>

							{/* Step 4: Professional Documents */}
							<FormStep isActive={currentStep === 3}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBriefcaseLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Professional Documents</h3>
									</div>

									<div className="space-y-4">
										<DocumentUploadItem
											label="Confirmation of Accounting Officer Letter"
											description="Letter on Auditor letterhead confirming accounting officer"
											required
											isUploaded={
												watch("professional.accountingOfficerLetter.isUploaded") ?? false
											}
											fileName={watch("professional.accountingOfficerLetter.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={5}
											onUpload={file =>
												handleFileUpload(
													file,
													"accounting_officer_letter",
													"professional.accountingOfficerLetter"
												)
											}
											onRemove={() =>
												handleFileRemove("professional.accountingOfficerLetter")
											}
											disabled={readOnly || uploadingDoc === "accounting_officer_letter"}
											error={errors.professional?.accountingOfficerLetter?.message}
										/>

										<DocumentUploadItem
											label="Auditor Report"
											description="Latest auditor report (if available)"
											isUploaded={watch("professional.auditorReport.isUploaded") ?? false}
											fileName={watch("professional.auditorReport.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"auditor_report",
													"professional.auditorReport"
												)
											}
											onRemove={() => handleFileRemove("professional.auditorReport")}
											disabled={readOnly || uploadingDoc === "auditor_report"}
										/>
									</div>
								</div>
							</FormStep>

							{/* Step 5: Industry Documents */}
							<FormStep isActive={currentStep === 4}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiGovernmentLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Industry Documents</h3>
									</div>

									<p className="text-sm text-muted-foreground">
										Upload any applicable regulatory certificates based on your industry.
									</p>

									<div className="space-y-4">
										<DocumentUploadItem
											label="FSCA Licence"
											description="Financial Sector Conduct Authority licence (for insurance)"
											isUploaded={watch("industry.fscaLicence.isUploaded") ?? false}
											fileName={watch("industry.fscaLicence.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={5}
											onUpload={file =>
												handleFileUpload(file, "fsca_licence", "industry.fscaLicence")
											}
											onRemove={() => handleFileRemove("industry.fscaLicence")}
											disabled={readOnly}
										/>

										<DocumentUploadItem
											label="PSIRA Certificate"
											description="Private Security Industry Regulatory Authority certificate"
											isUploaded={watch("industry.psiraCertificate.isUploaded") ?? false}
											fileName={watch("industry.psiraCertificate.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={5}
											onUpload={file =>
												handleFileUpload(
													file,
													"psira_certificate",
													"industry.psiraCertificate"
												)
											}
											onRemove={() => handleFileRemove("industry.psiraCertificate")}
											disabled={readOnly}
										/>

										<DocumentUploadItem
											label="NCR Registration"
											description="National Credit Regulator registration (for loans)"
											isUploaded={watch("industry.ncrRegistration.isUploaded") ?? false}
											fileName={watch("industry.ncrRegistration.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={5}
											onUpload={file =>
												handleFileUpload(
													file,
													"ncr_registration",
													"industry.ncrRegistration"
												)
											}
											onRemove={() => handleFileRemove("industry.ncrRegistration")}
											disabled={readOnly}
										/>

										<DocumentUploadItem
											label="NPO Constitution"
											description="Non-Profit Organisation constitution document"
											isUploaded={watch("industry.npoConstitution.isUploaded") ?? false}
											fileName={watch("industry.npoConstitution.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"npo_constitution",
													"industry.npoConstitution"
												)
											}
											onRemove={() => handleFileRemove("industry.npoConstitution")}
											disabled={readOnly}
										/>

										<DocumentUploadItem
											label="Other Regulatory Documents"
											description="Any other applicable regulatory certificates"
											isUploaded={watch("industry.otherRegulatory.isUploaded") ?? false}
											fileName={watch("industry.otherRegulatory.fileName")}
											acceptedFormats={["pdf"]}
											maxSizeMb={10}
											onUpload={file =>
												handleFileUpload(
													file,
													"other_regulatory",
													"industry.otherRegulatory"
												)
											}
											onRemove={() => handleFileRemove("industry.otherRegulatory")}
											disabled={readOnly}
										/>
									</div>
								</div>
							</FormStep>

							{/* Step 6: Review & Acknowledgement */}
							<FormStep isActive={currentStep === 5}>
								<div className="space-y-6">
									<div className="mb-4">
										<h3 className="text-lg font-semibold">Review & Acknowledgement</h3>
									</div>

									<div className="p-4 rounded-lg border border-border bg-muted/30">
										<h4 className="font-medium mb-4">Document Summary</h4>
										<div className="space-y-2 text-sm">
											{/* Count uploaded documents */}
											<p className="flex items-center justify-between">
												<span>Standard Documents:</span>
												<span className="font-medium">
													{
														[
															watch("standard.cipcRegistration.isUploaded"),
															watch("standard.taxClearance.isUploaded"),
															watch("standard.vatRegistration.isUploaded"),
															watch("standard.websiteDescription.isUploaded"),
														].filter(Boolean).length
													}{" "}
													/ 4 uploaded
												</span>
											</p>
											<p className="flex items-center justify-between">
												<span>Individual Documents:</span>
												<span className="font-medium">
													{individualDocs.length} person(s)
												</span>
											</p>
											<p className="flex items-center justify-between">
												<span>Financial Documents:</span>
												<span className="font-medium">
													{
														[
															watch("financial.bankStatementMonth1.isUploaded"),
															watch("financial.bankStatementMonth2.isUploaded"),
															watch("financial.bankStatementMonth3.isUploaded"),
														].filter(Boolean).length
													}{" "}
													/ 3 uploaded
												</span>
											</p>
											<p className="flex items-center justify-between">
												<span>Professional Documents:</span>
												<span className="font-medium">
													{
														[
															watch("professional.accountingOfficerLetter.isUploaded"),
															watch("professional.auditorReport.isUploaded"),
														].filter(Boolean).length
													}{" "}
													/ 2 uploaded
												</span>
											</p>
										</div>
									</div>

									<div
										className={cn(
											"flex items-start gap-3 p-4 rounded-lg border",
											errors.acknowledgement
												? "border-destructive bg-destructive/5"
												: "border-border"
										)}>
										<Checkbox
											id="acknowledgement"
											checked={watch("acknowledgement")}
											onCheckedChange={checked =>
												setValue("acknowledgement", checked as boolean)
											}
											disabled={readOnly}
										/>
										<Label
											htmlFor="acknowledgement"
											className="text-sm leading-relaxed cursor-pointer">
											I acknowledge that all documents uploaded are authentic, current,
											and accurate. I understand that providing false or misleading
											documents may result in the rejection of this application and
											potential legal action.
											<span className="text-destructive ml-1">*</span>
										</Label>
									</div>
									{errors.acknowledgement && (
										<p className="text-sm text-destructive">
											{errors.acknowledgement.message}
										</p>
									)}
								</div>
							</FormStep>
						</>
					)}
				</FormWizard>
			</form>
		</FormProvider>
	);
}
