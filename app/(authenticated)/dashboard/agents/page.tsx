import {
	RiAlertLine,
	RiCheckDoubleLine,
	RiRobot2Line,
	RiTimeLine,
} from "@remixicon/react";
import {
	AgentStatusCard,
	DashboardGrid,
	DashboardLayout,
	DashboardSection,
	StatsCard,
} from "@/components/dashboard";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import {
	getFinancialRiskAgentStats,
	getIdentityVerificationAgentStats,
	getQuoteAgentStats,
	getRiskAgentStats,
} from "@/lib/services/agent-stats";
import { getFastModel, getHighStakesModel } from "@/lib/ai/models";

export default async function AgentsPage({
	workflowNotifications,
}: {
	workflowNotifications: WorkflowNotification[];
}) {


	const [riskStats, quoteStats, financialRiskStats, identityVerificationStats] = await Promise.all([
		getRiskAgentStats(),
		getQuoteAgentStats(),
		getFinancialRiskAgentStats(),
		getIdentityVerificationAgentStats(),
	]);

	const agents = [
		{
			id: "1",
			agentId: "xt_risk_agent_v2",
			name: "Risk Verification Agent",
			taskType: "risk_verification",
			status: "active" as const,
			lastCallbackAt: riskStats.lastCallbackAt,
			callbackCount: riskStats.callbackCount,
			errorCount: riskStats.errorCount,
			aiModel: getHighStakesModel(),
			provider: "Google" as const,
			description:
				"Analyzes bank statements and accountant letters for FICA compliance and risk scoring.",
		},
		{
			id: "2",
			agentId: "xt_quote_agent_v1",
			name: "Quote Generator Agent",
			taskType: "quote_generation",
			status: "active" as const,
			lastCallbackAt: quoteStats.lastCallbackAt,
			callbackCount: quoteStats.callbackCount,
			errorCount: quoteStats.errorCount,
			aiModel: getFastModel(),
			provider: "Google" as const,
			description:
				"Generates risk-adjusted quotes based on company profile and credit score.",
		},
		{
			id: "3",
			agentId: "xt_financial_risk_agent_v1",
			name: "Financial Risk Agent",
			taskType: "financial_risk_assessment",
			status: "active" as const,
			lastCallbackAt: financialRiskStats.lastCallbackAt,
			callbackCount: financialRiskStats.callbackCount,
			errorCount: financialRiskStats.errorCount,
			aiModel: getHighStakesModel(),
			provider: "Google" as const,
			description: "Analyzes financial documents for risk assessment.",
		},

		{
			id: "4",
			agentId: "xt_document-proofer_v1",
			name: "Document Proofing Agent",
			taskType: "document_proofing",
			status: "active" as const,
			lastCallbackAt: identityVerificationStats.lastCallbackAt,
			callbackCount: identityVerificationStats.callbackCount,
			errorCount: identityVerificationStats.errorCount,
			primaryStatLabel: "Verifications",
			secondaryStatLabel: "Failures",
			lastActivityLabel: "Last verification",
			aiModel: "Google Cloud Document AI",
			provider: "Google" as const,
			description: "Scans and verifies legitimacy of ID documents via Document AI Identity Proofing.",
		},
	];

	const stats = {
		totalAgents: agents.length,
		activeAgents: agents.filter(a => a.status === "active").length,
		totalCallbacks: agents.reduce((acc, a) => acc + a.callbackCount, 0),
		totalErrors: agents.reduce((acc, a) => acc + a.errorCount, 0),
	};

	return (
		<DashboardLayout
			title="Agents"
			description="Monitor your external agent fleet"
			notifications={workflowNotifications}>
			{/* Agent Stats */}
			<DashboardGrid columns={2} className="mb-8">
				<StatsCard
					title="Total Agents"
					value={stats.totalAgents}
					icon={RiRobot2Line}
					iconColor="amber"
				/>
				<StatsCard
					title="Active"
					value={stats.activeAgents}
					icon={RiCheckDoubleLine}
					iconColor="green"
				/>
				<StatsCard
					title="Total Callbacks"
					value={stats.totalCallbacks}
					icon={RiTimeLine}
					iconColor="blue"
				/>
				<StatsCard
					title="Errors"
					value={stats.totalErrors}
					icon={RiAlertLine}
					iconColor="red"
				/>
			</DashboardGrid>

			{/* Agent Grid */}
			<DashboardSection title="Agent Fleet">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
					{agents.map(agent => (
						<AgentStatusCard key={agent.id} agent={agent} />
					))}
				</div>
			</DashboardSection>
		</DashboardLayout>
	);
}
