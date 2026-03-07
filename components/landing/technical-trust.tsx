"use client";

import { motion } from "framer-motion";
import { FileSearch, Lock, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TechnicalTrust() {
	return (
		<section className="py-24 bg-background border-t border-border">
			<div className="container px-4 mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
						Built for the Rigor of Regulation
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Enterprise-grade security and compliance baked into every step of the
						workflow.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8">
					{[
						{
							title: "Audit Trails",
							icon: FileSearch,
							description:
								"Complete history of every action, approval, and document view. Nothing gets lost, everything is trackable.",
						},
						{
							title: "Secure Storage",
							icon: Lock,
							description:
								"Bank-grade encryption for all client documents. Your data is protected by industry-leading security standards.",
						},
						{
							title: "Standardized Process",
							icon: Scale,
							description:
								"Enforce compliance rules automatically. Ensure every client goes through the exact same rigorous checks.",
						},
					].map((feature, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-50px" }}
							transition={{ duration: 0.5, delay: index * 0.1 }}>
							<Card className="bg-card border-border hover:border-primary/50 transition-colors h-full shadow-sm">
								<CardHeader>
									<div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
										<feature.icon className="w-6 h-6 text-foreground" />
									</div>
									<CardTitle className="text-foreground">{feature.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground">{feature.description}</p>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
