import { Button } from "@/components/ui/button";
import {
	PRIMARY_RISK_TABS,
	type PrimaryRiskTabId,
} from "@/components/dashboard/risk-review/risk-review-config";

export function RiskReviewTabs({
	activeTab,
	onTabChange,
}: {
	activeTab: PrimaryRiskTabId;
	onTabChange: (tab: PrimaryRiskTabId) => void;
}) {
	return (
		<div className="flex flex-wrap gap-4 py-2">
			{PRIMARY_RISK_TABS.map(tab => (
				<Button
					key={tab.id}
					onClick={() => onTabChange(tab.id)}
					className={`flex flex-col items-start px-5 py-8 rounded-md border transition-all ${
						activeTab === tab.id
							? "bg-secondary border-primary/50 shadow-md shadow-primary/5"
							: "bg-card/30 border-border hover:bg-secondary/50 hover:border-border"
					}`}>
					<span
						className={`text-sm font-semibold pb-1 leading-2.5 ${
							activeTab === tab.id ? "text-primary" : "text-foreground"
						}`}>
						{tab.label}
					</span>
					<span className="text-xs py-0 leading-1.5 text-muted-foreground">
						{tab.subtitle}
					</span>
				</Button>
			))}
		</div>
	);
}
