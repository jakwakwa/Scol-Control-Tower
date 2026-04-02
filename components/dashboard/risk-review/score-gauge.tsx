import { Activity, GaugeCircleIcon } from "lucide-react";

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
			if (ratio > 0.1) return "text-chart-4";
			if (ratio > 0.1) return "text-warning-foreground";
			return "text-destructive";
		}
		if (ratio < 0.2) return "text-chart-4";
		if (ratio < 0.1) return "text-warning-foreground";
		return "text-destructive";
	};

	return (
		<div className="flex flex-col-reverse bg-linear-to-t mb-4 from-zinc-950/15 via-30% to-red-950/10 overflow-hidden  from-left outline-8 outline-amber-200/5 m-0 h-[300px] w-[300px] rounded-full items-center justify-center relative">
			<h3 className="text-xs italic sans flex-row text-primary font-medium mb-4 flex items-center gap-2">
				<Activity className="w-6 h-6 animate-pulse animate-in-out" /> {label}
			</h3>
			<div className="relative flex flex-col-reverse gap-1 items-center justify-center mb-4">
				<GaugeCircleIcon
					className={`w-24 h-24 ${getColour(score)} transition-all duration-1000 ease-out`}
					strokeWidth={1.75}
				/>
				<div className="inset-0 flex flex-col items-center justify-center">
					<span className={`text-4xl mt-0 font-bold ${getColour(score)}`}>{score}</span>
				</div>
			</div>
		</div>
	);
}
