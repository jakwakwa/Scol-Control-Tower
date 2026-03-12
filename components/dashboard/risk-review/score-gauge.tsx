import { Activity, CircleGauge } from "lucide-react";

export function ScoreGauge({
	score,
	label,
	max = 100,
	inverse = false,
}: {
	score: number;
	label: string;
	max?: number;
	inverse?: boolean;
}) {
	const getColour = (val: number) => {
		const ratio = val / max;
		if (inverse) {
			if (ratio > 0.7) return "text-chart-4";
			if (ratio > 0.4) return "text-warning-foreground";
			return "text-destructive";
		}
		if (ratio < 0.3) return "text-chart-4";
		if (ratio < 0.7) return "text-warning-foreground";
		return "text-destructive";
	};

	return (
		<div className="flex flex-col items-center justify-center relative">
			<h3 className="text-sm text-muted-foreground font-medium mb-4 flex items-center gap-2">
				<Activity className="w-4 h-4" /> {label}
			</h3>
			<div className="relative flex items-center justify-center mb-2">
				<CircleGauge
					className={`w-28 h-28 ${getColour(score)} transition-all duration-1000 ease-out`}
					strokeWidth={1.75}
				/>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className={`text-3xl font-bold ${getColour(score)}`}>{score}</span>
				</div>
			</div>
		</div>
	);
}
