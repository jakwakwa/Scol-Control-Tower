"use client";

import Grainient from "@/components/Grainient";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { OldVsNew } from "@/components/landing/old-vs-new";
import { RoleTabs } from "@/components/landing/role-tabs";
import { TechnicalTrust } from "@/components/landing/technical-trust";
import { TrustedBy } from "@/components/landing/trusted-by";
import { WorkflowSteps } from "@/components/landing/workflow-steps";

export default function Page() {
	return (
		<div className="relative my-0 py-0 overflow-hidden selection:text-cyan-600 w-screen flex flex-col bg-transparent">
			<div className="absolute h-full backdrop-blur-sm">
				<Grainient
					color1="#3A2E1A"
					color2="#382603"
					color3="#1E1103"
					timeSpeed={0.3}
					colorBalance={-0.17}
					warpStrength={0.7}
					warpFrequency={5}
					warpSpeed={0.9}
					warpAmplitude={50}
					blendAngle={0}
					blendSoftness={0.35}
					rotationAmount={310}
					noiseScale={2.25}
					grainAmount={0.06}
					grainScale={2}
					grainAnimated={false}
					contrast={1.1}
					gamma={0.85}
					saturation={0.8}
					centerX={-0.44}
					centerY={0}
					zoom={0.9}
				/>
			</div>
			<main className="relative mb-0 py-0 overflow-hidden selection:text-primary h-full">
				<Hero />
				<TrustedBy />
				<OldVsNew />
				<WorkflowSteps />
				<RoleTabs />
				<TechnicalTrust />
				<Footer />
			</main>
		</div>
	);
}
