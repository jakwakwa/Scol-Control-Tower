import type React from "react";
import { cn } from "@/lib/utils";
import type { PipelineWorkflow } from "./pipeline-view";

interface PipelineStageProps {
	stage: {
		id: string;
		title: string;
		color: string;
		icon: React.ElementType;
	};
	columns: Record<string, PipelineWorkflow[]>;
}

const PipelineStage = ({ stage, columns }: PipelineStageProps): React.ReactElement => {
	return (
		<div
			className={cn(
				"flex items-center bg-card after:rounded-2xl before:rounded-2xl w-full h-auto backdrop-blur-sm justify-center py-3	 px-4 gap-2 rounded-xl shadow-md shadow-black border-t-[1.5px] mb-4",
				stage.color
			)}>
			<div className="flex flex-col items-start	justify-center gap-2 w-full">
				<stage.icon className="h-6 w-6 outline-0 border-none text-muted-foreground" />
				<h3 className="font-bold text-xs text-foreground uppercase tracking-tight">
					{stage.title}
				</h3>
			</div>
			<div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-muted-foreground border border-sidebar-border bg-background/50">
				{columns[stage.id]?.length || 0}
			</div>
		</div>
	);
};
export default PipelineStage;
