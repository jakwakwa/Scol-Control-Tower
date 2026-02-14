import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const Footer = () => {
	return (
		<footer className="bg-background py-12 border-t border-border">
			<div className="container px-4 mx-auto">
				{/* CTA Section */}
				<div className="text-center mb-20">
					<h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
						Ready to take control?
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto mb-8">
						Join the forward-thinking teams transforming their onboarding with Control
						Tower.
					</p>
					<a href="/sign-up">
						<Button
							size="lg"
							className="rounded-full h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90">
							Request Access
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</a>
				</div>

				{/* Footer Links */}
				<div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-border">
					<div className="flex flex-col items-center md:items-start gap-2">
						<div className="text-xl font-bold text-foreground tracking-tighter">
							SCOL <span className="text-muted-foreground">CONTROL TOWER</span>
						</div>
						<p className="text-sm text-muted-foreground">
							© {new Date().getFullYear()} StratCol. All rights reserved.
						</p>
					</div>

					<div className="flex items-center gap-8 text-sm text-muted-foreground">
						<Link href="#" className="hover:text-foreground transition-colors">
							Privacy Policy
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors">
							Terms of Service
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors">
							Contact Support
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
};
