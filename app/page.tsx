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
					color1="#353A45"
					color2="#725E36"
					color3="#271D0D"
					timeSpeed={0.3}
					colorBalance={-0.27}
					warpStrength={0.7}
					warpFrequency={10}
					warpSpeed={0.4}
					warpAmplitude={30}
					blendAngle={60}
					blendSoftness={0.25}
					rotationAmount={70}
					noiseScale={0.25}
					grainAmount={0.06}
					grainScale={10}
					grainAnimated={false}
					contrast={1.4}
					gamma={0.85}
					saturation={0.8}
					centerX={0.112}
					centerY={-0.13}
					zoom={0.8}
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
