import { relations } from "drizzle-orm/relations";
import { applicants, activityLogs, workflows, xtCallbacks, aiAnalysisLogs, workflowEvents, aiFeedbackLogs, applicantMagiclinkForms, applicantSubmissions, internalForms, documentUploads, documents, internalSubmissions, notifications, quotes, workflowTerminationDenyList, reApplicantAttempts, riskAssessments, riskCheckResults, sanctionClearance, signatures, workflowTerminationScreening } from "./schema";

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	applicant: one(applicants, {
		fields: [activityLogs.applicantId],
		references: [applicants.id]
	}),
}));

export const applicantsRelations = relations(applicants, ({many}) => ({
	activityLogs: many(activityLogs),
	aiAnalysisLogs: many(aiAnalysisLogs),
	aiFeedbackLogs: many(aiFeedbackLogs),
	applicantMagiclinkForms: many(applicantMagiclinkForms),
	applicantSubmissions: many(applicantSubmissions),
	documents: many(documents),
	notifications: many(notifications),
	quotes: many(quotes),
	reApplicantAttempts: many(reApplicantAttempts),
	riskAssessments: many(riskAssessments),
	riskCheckResults: many(riskCheckResults),
	sanctionClearances: many(sanctionClearance),
	workflowTerminationDenyLists: many(workflowTerminationDenyList),
	workflows: many(workflows),
}));

export const xtCallbacksRelations = relations(xtCallbacks, ({one}) => ({
	workflow: one(workflows, {
		fields: [xtCallbacks.workflowId],
		references: [workflows.id]
	}),
}));

export const workflowsRelations = relations(workflows, ({one, many}) => ({
	xtCallbacks: many(xtCallbacks),
	aiAnalysisLogs: many(aiAnalysisLogs),
	aiFeedbackLogs: many(aiFeedbackLogs),
	applicantMagiclinkForms: many(applicantMagiclinkForms),
	applicantSubmissions: many(applicantSubmissions),
	documentUploads: many(documentUploads),
	internalForms: many(internalForms),
	notifications: many(notifications),
	quotes: many(quotes),
	reApplicantAttempts: many(reApplicantAttempts),
	riskCheckResults: many(riskCheckResults),
	sanctionClearances: many(sanctionClearance),
	signatures: many(signatures),
	workflowEvents: many(workflowEvents),
	workflowTerminationDenyLists: many(workflowTerminationDenyList),
	applicant: one(applicants, {
		fields: [workflows.applicantId],
		references: [applicants.id]
	}),
}));

export const aiAnalysisLogsRelations = relations(aiAnalysisLogs, ({one}) => ({
	workflow: one(workflows, {
		fields: [aiAnalysisLogs.workflowId],
		references: [workflows.id]
	}),
	applicant: one(applicants, {
		fields: [aiAnalysisLogs.applicantId],
		references: [applicants.id]
	}),
}));

export const aiFeedbackLogsRelations = relations(aiFeedbackLogs, ({one}) => ({
	workflowEvent: one(workflowEvents, {
		fields: [aiFeedbackLogs.relatedFailureEventId],
		references: [workflowEvents.id]
	}),
	applicant: one(applicants, {
		fields: [aiFeedbackLogs.applicantId],
		references: [applicants.id]
	}),
	workflow: one(workflows, {
		fields: [aiFeedbackLogs.workflowId],
		references: [workflows.id]
	}),
}));

export const workflowEventsRelations = relations(workflowEvents, ({one, many}) => ({
	aiFeedbackLogs: many(aiFeedbackLogs),
	workflow: one(workflows, {
		fields: [workflowEvents.workflowId],
		references: [workflows.id]
	}),
}));

export const applicantMagiclinkFormsRelations = relations(applicantMagiclinkForms, ({one, many}) => ({
	workflow: one(workflows, {
		fields: [applicantMagiclinkForms.workflowId],
		references: [workflows.id]
	}),
	applicant: one(applicants, {
		fields: [applicantMagiclinkForms.applicantId],
		references: [applicants.id]
	}),
	applicantSubmissions: many(applicantSubmissions),
}));

export const applicantSubmissionsRelations = relations(applicantSubmissions, ({one}) => ({
	workflow: one(workflows, {
		fields: [applicantSubmissions.workflowId],
		references: [workflows.id]
	}),
	applicant: one(applicants, {
		fields: [applicantSubmissions.applicantId],
		references: [applicants.id]
	}),
	applicantMagiclinkForm: one(applicantMagiclinkForms, {
		fields: [applicantSubmissions.applicantMagiclinkFormId],
		references: [applicantMagiclinkForms.id]
	}),
}));

export const documentUploadsRelations = relations(documentUploads, ({one}) => ({
	internalForm: one(internalForms, {
		fields: [documentUploads.internalFormId],
		references: [internalForms.id]
	}),
	workflow: one(workflows, {
		fields: [documentUploads.workflowId],
		references: [workflows.id]
	}),
}));

export const internalFormsRelations = relations(internalForms, ({one, many}) => ({
	documentUploads: many(documentUploads),
	workflow: one(workflows, {
		fields: [internalForms.workflowId],
		references: [workflows.id]
	}),
	internalSubmissions: many(internalSubmissions),
	signatures: many(signatures),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	applicant: one(applicants, {
		fields: [documents.applicantId],
		references: [applicants.id]
	}),
}));

export const internalSubmissionsRelations = relations(internalSubmissions, ({one}) => ({
	internalForm: one(internalForms, {
		fields: [internalSubmissions.internalFormId],
		references: [internalForms.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	applicant: one(applicants, {
		fields: [notifications.applicantId],
		references: [applicants.id]
	}),
	workflow: one(workflows, {
		fields: [notifications.workflowId],
		references: [workflows.id]
	}),
}));

export const quotesRelations = relations(quotes, ({one}) => ({
	workflow: one(workflows, {
		fields: [quotes.workflowId],
		references: [workflows.id]
	}),
	applicant: one(applicants, {
		fields: [quotes.applicantId],
		references: [applicants.id]
	}),
}));

export const reApplicantAttemptsRelations = relations(reApplicantAttempts, ({one}) => ({
	workflowTerminationDenyList: one(workflowTerminationDenyList, {
		fields: [reApplicantAttempts.matchedDenyListId],
		references: [workflowTerminationDenyList.id]
	}),
	workflow: one(workflows, {
		fields: [reApplicantAttempts.workflowId],
		references: [workflows.id]
	}),
	applicant: one(applicants, {
		fields: [reApplicantAttempts.applicantId],
		references: [applicants.id]
	}),
}));

export const workflowTerminationDenyListRelations = relations(workflowTerminationDenyList, ({one, many}) => ({
	reApplicantAttempts: many(reApplicantAttempts),
	applicant: one(applicants, {
		fields: [workflowTerminationDenyList.applicantId],
		references: [applicants.id]
	}),
	workflow: one(workflows, {
		fields: [workflowTerminationDenyList.workflowId],
		references: [workflows.id]
	}),
	workflowTerminationScreenings: many(workflowTerminationScreening),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({one}) => ({
	applicant: one(applicants, {
		fields: [riskAssessments.applicantId],
		references: [applicants.id]
	}),
}));

export const riskCheckResultsRelations = relations(riskCheckResults, ({one}) => ({
	applicant: one(applicants, {
		fields: [riskCheckResults.applicantId],
		references: [applicants.id]
	}),
	workflow: one(workflows, {
		fields: [riskCheckResults.workflowId],
		references: [workflows.id]
	}),
}));

export const sanctionClearanceRelations = relations(sanctionClearance, ({one}) => ({
	workflow: one(workflows, {
		fields: [sanctionClearance.workflowId],
		references: [workflows.id]
	}),
	applicant: one(applicants, {
		fields: [sanctionClearance.applicantId],
		references: [applicants.id]
	}),
}));

export const signaturesRelations = relations(signatures, ({one}) => ({
	internalForm: one(internalForms, {
		fields: [signatures.internalFormId],
		references: [internalForms.id]
	}),
	workflow: one(workflows, {
		fields: [signatures.workflowId],
		references: [workflows.id]
	}),
}));

export const workflowTerminationScreeningRelations = relations(workflowTerminationScreening, ({one}) => ({
	workflowTerminationDenyList: one(workflowTerminationDenyList, {
		fields: [workflowTerminationScreening.denyListId],
		references: [workflowTerminationDenyList.id]
	}),
}));