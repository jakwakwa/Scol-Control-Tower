import { Activity } from "lucide-react";

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

	const percentage = (score / max) * 100;
	const dashoffset = 351.85 - (351.85 * percentage) / 100;

	return (
		<div className="flex flex-col items-center justify-center relative">
			<h3 className="text-sm text-muted-foreground font-medium mb-4 flex items-center gap-2">
				<Activity className="w-4 h-4" /> {label}
			</h3>
			<div className="relative flex items-center justify-center mb-2">
				<svg className="w-28 h-28 transform -rotate-90">
					<circle
						cx="56"
						cy="56"
						r="48"
						className="text-muted stroke-current"
						strokeWidth="8"
						fill="transparent"
					/>
					<circle
						cx="56"
						cy="56"
						r="48"
						className={`${getColour(score)} stroke-current transition-all duration-1000 ease-out`}
						strokeWidth="8"
						fill="transparent"
						strokeDasharray="351.85"
						strokeDashoffset={dashoffset}
						strokeLinecap="round"
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className={`text-3xl font-bold ${getColour(score)}`}>{score}</span>
				</div>
			</div>
		</div>
	);
}
