import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { OldVsNew } from "@/components/landing/old-vs-new";
import { RoleTabs } from "@/components/landing/role-tabs";
import { TechnicalTrust } from "@/components/landing/technical-trust";
import { TrustedBy } from "@/components/landing/trusted-by";
import { WorkflowSteps } from "@/components/landing/workflow-steps";

export default function Page() {
	return (
		<main className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/30 selection:text-primary">
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
