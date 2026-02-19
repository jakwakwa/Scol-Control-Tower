import {
	RiAlertLine,
	RiArrowLeftLine,
	RiCheckLine,
	RiEditLine,
	RiFileTextLine,
	RiTimeLine,
} from "@remixicon/react";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { applicants, internalForms, workflows } from "@/db/schema";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

type FormTypeKey =
	| "stratcol_agreement"
	| "facility_application"
	| "absa_6995"
	| "fica_documents";

interface FormConfig {
	type: FormTypeKey;
	title: string;
	description: string;
	stage: number;
	icon: typeof RiFileTextLine;
}

// ============================================
// Form Configuration
// ============================================

const FORM_CONFIGS: FormConfig[] = [
	{
		type: "stratcol_agreement",
		title: "StratCol Agreement",
		description: "Core contract establishing legal relationship and entity data",
		stage: 2,
		icon: RiFileTextLine,
	},
	{
		type: "facility_application",
		title: "Facility Application",
		description:
			"Service selection and volume metrics used for pre-risk and quote calculation",
		stage: 2,
		icon: RiFileTextLine,
	},
	{
		type: "absa_6995",
		title: "Absa 6995 Pre-screening",
		description: "Mandatory bank assessment for collection facilities",
		stage: 3,
		icon: RiFileTextLine,
	},
	{
		type: "fica_documents",
		title: "FICA Documents",
		description:
			"Required documents for FICA verification, then ITC and main sanctions checks run",
		stage: 3,
		icon: RiFileTextLine,
	},
];

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG = {
	not_started: {
		label: "Not Started",
		colour: "bg-muted text-muted-foreground",
		icon: RiTimeLine,
	},
	in_progress: {
		label: "In Progress",
		colour: "bg-amber-500/20 text-amber-500",
		icon: RiEditLine,
	},
	submitted: {
		label: "Submitted",
		colour: "bg-blue-500/20 text-blue-500",
		icon: RiTimeLine,
	},
	approved: {
		label: "Approved",
		colour: "bg-teal-500/40 text-teal-700",
		icon: RiCheckLine,
	},
	rejected: {
		label: "Rejected",
		colour: "bg-red-500/20 text-red-500",
		icon: RiAlertLine,
	},
	revision_required: {
		label: "Revision Required",
		colour: "bg-amber-500/20 text-amber-500",
		icon: RiAlertLine,
	},
};

// ============================================
// Page Component
// ============================================

export default async function FormsHubPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const workflowId = parseInt(id, 10);

	if (Number.isNaN(workflowId)) {
		notFound();
	}

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	// Fetch workflow and applicant
	const workflowResults = await db
		.select({
			workflow: workflows,
			applicant: applicants,
		})
		.from(workflows)
		.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
		.where(eq(workflows.id, workflowId))
		.limit(1);

	if (workflowResults.length === 0 || !workflowResults[0]) {
		notFound();
	}

	const result = workflowResults[0];
	const { workflow, applicant } = result;

	// Fetch all forms for this workflow
	const forms = await db
		.select()
		.from(internalForms)
		.where(eq(internalForms.workflowId, workflowId));

	// Create a map of form type to form data
	const formMap = new Map(forms.map(f => [f.formType, f]));

	// Calculate progress
	const totalForms = FORM_CONFIGS.length;
	const completedForms = forms.filter(
		f => f.status === "approved" || f.status === "submitted"
	).length;
	const progressPercent = Math.round((completedForms / totalForms) * 100);

	return (
		<DashboardLayout
			actions={
				<div className="flex items-center gap-4">
					<Link href={`/dashboard/workflows/${workflowId}`}>
						<Button variant="ghost" size="sm" className="gap-1.5">
							<RiArrowLeftLine className="h-4 w-4" />
							Back to Workflow
						</Button>
					</Link>
				</div>
			}>
			<div className="space-y-8">
				{/* Header */}
				<div>
					<h1 className="text-2xl font-bold text-foreground">Onboarding Forms</h1>
					<p className="text-muted-foreground mt-1">
						{applicant?.companyName || "Unknown"} - Complete forms in order: Facility
						Application, Pre-risk (if flagged), Quote, then FICA to trigger ITC and
						sanctions checks.
					</p>
				</div>

				{/* Progress Overview */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Progress Overview</CardTitle>
						<CardDescription>
							{completedForms} of {totalForms} forms completed
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Overall Progress</span>
								<span className="font-medium">{progressPercent}%</span>
							</div>
							<div className="h-2 rounded-full bg-muted overflow-hidden">
								<div
									className="h-full bg-teal-500 transition-all duration-500"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Forms Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{FORM_CONFIGS.map(config => {
						const form = formMap.get(config.type);
						const status = form?.status || "not_started";
						const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
						const Icon = config.icon;
						const StatusIcon = statusConfig.icon;

						const isAccessible =
							workflow.stage >= config.stage || status !== "not_started";
						const canEdit =
							status === "not_started" ||
							status === "in_progress" ||
							status === "revision_required";

						return (
							<Card
								key={config.type}
								className={cn(
									"transition-all duration-200",
									isAccessible ? "hover:border-primary/50 hover:shadow-lg" : "opacity-50"
								)}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div className="p-2 rounded-lg bg-muted">
												<Icon className="h-5 w-5 text-muted-foreground" />
											</div>
											<div>
												<CardTitle className="text-base">{config.title}</CardTitle>
												<p className="text-xs text-muted-foreground mt-0.5">
													Stage {config.stage}
												</p>
											</div>
										</div>
										<Badge variant="outline" className={cn("gap-1", statusConfig.colour)}>
											<StatusIcon className="h-3 w-3" />
											{statusConfig.label}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground mb-4">
										{config.description}
									</p>

									{form && (
										<div className="text-xs text-muted-foreground mb-4 space-y-1">
											{form.lastSavedAt && (
												<p>
													Last saved: {new Date(form.lastSavedAt).toLocaleDateString()}
												</p>
											)}
											{form.currentStep && form.totalSteps && (
												<p>
													Progress: Step {form.currentStep} of {form.totalSteps}
												</p>
											)}
										</div>
									)}

									<Link
										href={
											isAccessible
												? `/dashboard/applications/${workflowId}/forms/${config.type}`
												: "#"
										}>
										<Button
											variant={canEdit ? "default" : "outline"}
											size="sm"
											className="w-full"
											disabled={!isAccessible}>
											{status === "not_started" && "Start Form"}
											{status === "in_progress" && "Continue"}
											{status === "revision_required" && "Revise"}
											{(status === "submitted" || status === "approved") && "View"}
											{status === "rejected" && "View & Resubmit"}
										</Button>
									</Link>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</DashboardLayout>
	);
}
