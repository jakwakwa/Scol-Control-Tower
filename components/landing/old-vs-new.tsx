"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OldVsNew() {
	return (
		<section className="py-24 bg-background">
			<div className="container px-4 mx-auto">
				<div className="text-center mb-16">
					<Badge variant="outline" className="mb-4 border-primary/20 text-primary">
						Problem vs Solution
					</Badge>
					<h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
						From Paper Chase to Digital Engine
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Stop losing revenue to manual processes. Compare the old way of onboarding
						with the StratCol Control Tower.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
					{/* The Old Way */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.5 }}>
						<Card className="h-full bg-card border-border relative overflow-hidden group shadow-sm">
							<div className="absolute top-0 left-0 w-full h-1 bg-destructive/50" />
							<CardHeader>
								<div className="flex items-center justify-between mb-4">
									<CardTitle className="text-muted-foreground">The Paper Chase</CardTitle>
									<Clock className="w-6 h-6 text-destructive/50" />
								</div>
								<div className="text-2xl font-bold text-foreground">Manual & Slow</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<ul className="space-y-4">
									{[
										"Physical documents lost in email threads",
										"Manual risk assessments taking days",
										"Opaque application status",
										"High drop-off rates due to friction",
									].map((item, i) => (
										<li key={i} className="flex items-start gap-3">
											<XCircle className="w-5 h-5 text-destructive/50 shrink-0 mt-0.5" />
											<span className="text-muted-foreground">{item}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					</motion.div>

					{/* The New Way */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.5, delay: 0.2 }}>
						<Card className="h-full bg-card border-primary/20 relative overflow-hidden ring-1 ring-primary/10 shadow-lg">
							<div className="absolute top-0 left-0 w-full h-1 bg-primary" />
							<div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

							<CardHeader>
								<div className="flex items-center justify-between mb-4">
									<CardTitle className="text-primary">The Digital Engine</CardTitle>
									<Zap className="w-6 h-6 text-primary" />
								</div>
								<div className="text-2xl font-bold text-foreground">
									Automated & Secure
								</div>
							</CardHeader>
							<CardContent className="space-y-4 relative z-10">
								<ul className="space-y-4">
									{[
										"Instant digital uploads & verification",
										"AI-powered risk scoring in seconds",
										"Real-time pipeline visibility",
										"Frictionless client experience",
									].map((item, i) => (
										<li key={i} className="flex items-start gap-3">
											<CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
											<span className="text-foreground">{item}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
