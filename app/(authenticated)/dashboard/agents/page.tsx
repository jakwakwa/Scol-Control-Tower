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
import { getQuoteAgentStats, getRiskAgentStats } from "@/lib/services/agent-stats";

export default async function AgentsPage({
	workflowNotifications,
}: {
	workflowNotifications: WorkflowNotification[];
}) {
	// Fetch real stats
	const [riskStats, quoteStats] = await Promise.all([
		getRiskAgentStats(),
		getQuoteAgentStats(),
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
			aiModel: "Gemini 3 Flash",
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
			aiModel: "Gemini 3 Flash",
			provider: "Google" as const,
			description:
				"Generates risk-adjusted quotes based on company profile and credit score.",
		},
		{
			id: "3",
			agentId: "xt_doc_agent_v1",
			name: "Document Generator",
			taskType: "document_generation",
			status: "inactive" as const,
			lastCallbackAt: undefined,
			callbackCount: 0,
			errorCount: 0,
			aiModel: "-",
			provider: "Planned" as const,
			description: "Planned capability - agent not active.",
		},
		{
			id: "4",
			agentId: "xt_esign_agent_v1",
			name: "E-Signature Handler",
			taskType: "electronic_signature",
			status: "inactive" as const,
			lastCallbackAt: undefined,
			callbackCount: 0,
			errorCount: 0,
			aiModel: "-",
			provider: "Planned" as const,
			description: "Planned capability - agent not active.",
		},
		{
			id: "5",
			agentId: "xt_sync_agent_v1",
			name: "agreementContract_sync",
			taskType: "data_sync",
			status: "inactive" as const,
			lastCallbackAt: undefined,
			callbackCount: 0,
			errorCount: 0,
			aiModel: "-",
			provider: "Planned" as const,
			description: "Planned capability - agent not active.",
		},
		{
			id: "6",
			agentId: "xt_notify_agent_v1",
			name: "Notification Handler",
			taskType: "notification",
			status: "inactive" as const,
			lastCallbackAt: undefined,
			callbackCount: 0,
			errorCount: 0,
			aiModel: "-",
			provider: "Planned" as const,
			description: "Planned capability - agent not active.",
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
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Total Agents"
					value={stats.totalAgents}
					icon={RiRobot2Line}
					iconColor="amber"
				/>
				<StatsCard
					title="Active"
					value={stats.activeAgents}
					change={{ value: 0, trend: "neutral" }}
					icon={RiCheckDoubleLine}
					iconColor="green"
				/>
				<StatsCard
					title="Total Callbacks"
					value={stats.totalCallbacks}
					change={{ value: 15, trend: "up" }}
					icon={RiTimeLine}
					iconColor="blue"
				/>
				<StatsCard
					title="Errors"
					value={stats.totalErrors}
					change={{ value: 2, trend: "down" }}
					icon={RiAlertLine}
					iconColor="red"
				/>
			</DashboardGrid>

			{/* Agent Grid */}
			<DashboardSection title="Agent Fleet">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{agents.map(agent => (
						<AgentStatusCard key={agent.id} agent={agent} />
					))}
				</div>
			</DashboardSection>
		</DashboardLayout>
	);
}
