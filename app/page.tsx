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
		<main className="min-h-screen overflow-x-hidden selection:text-primary">
			<div className="absolute w-screen h-full">
				<Grainient
					color1="#1a2d3a"
					color2="#091c23"
					color3="#123135"
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
			<Hero />
			<TrustedBy />
			<OldVsNew />
			<WorkflowSteps />
			<RoleTabs />
			<TechnicalTrust />
			<Footer />
		</main>
	);
}
