"use client";

import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RoleTabs() {
	return (
		<section className="py-24 bg-muted/30">
			<div className="container px-4 mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
						Tailored for Your Team
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Whether you're closing deals or managing risk, Control Tower empowers you to
						do your best work.
					</p>
				</div>

				<div className="max-w-4xl mx-auto">
					<Tabs defaultValue="sales" className="w-full">
						<div>
							<TabsList className="bg-black/10 rounded-xl mx-auto w-full border border-border p-0">
								<TabsTrigger
									value="sales"
									className="px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">
									Account Executives
								</TabsTrigger>
								<TabsTrigger
									value="risk"
									className="px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">
									For Risk Managers
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="sales">
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3 }}>
								<Card className="bg-card border-border overflow-hidden shadow-lg">
									<div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
										<div className="space-y-6">
											<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
												<Briefcase className="w-4 h-4" />
												<span>Sales Focus</span>
											</div>
											<h3 className="text-3xl font-bold text-foreground">
												Close Deals Faster
											</h3>
											<p className="text-muted-foreground text-lg">
												Send mandates digitally and track every signature in real-time.
												Never lose momentum on a deal because of paperwork again.
											</p>
											<ul className="space-y-3">
												{[
													"Real-time deal tracking",
													"Digital mandate generation",
													"Instant client notifications",
												].map((item, i) => (
													<li key={i} className="flex items-center gap-3">
														<div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
															<Check className="w-4 h-4 text-primary" />
														</div>
														<span className="text-foreground">{item}</span>
													</li>
												))}
											</ul>
										</div>
										<div className="relative aspect-square md:aspect-auto h-full min-h-[300px] bg-muted/50 rounded-xl border border-border p-4">
											{/* Abstract Visualization */}
											<div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent" />
											<div className="absolute bottom-4 right-4 bg-card p-4 rounded-lg border border-border shadow-xl max-w-xs animate-in slide-in-from-bottom-5 fade-in duration-700">
												<div className="flex items-center gap-3 mb-2">
													<div className="w-2 h-2 rounded-full bg-success" />
													<span className="text-xs font-medium text-foreground">
														Mandate Signed
													</span>
												</div>
												<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
													<div className="h-full w-3/4 bg-success rounded-full" />
												</div>
											</div>
										</div>
									</div>
								</Card>
							</motion.div>
						</TabsContent>

						<TabsContent value="risk">
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3 }}>
								<Card className="bg-card border-border overflow-hidden shadow-lg">
									<div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
										<div className="space-y-6">
											<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning-foreground text-sm font-medium border border-warning/20">
												<Shield className="w-4 h-4" />
												<span>Compliance Focus</span>
											</div>
											<h3 className="text-3xl font-bold text-foreground">
												Compliance Without the Headache
											</h3>
											<p className="text-muted-foreground text-lg">
												AI-powered risk scoring and centralized document verification. Let
												automation handle the routine checks while you focus on the
												exceptions.
											</p>
											<ul className="space-y-3">
												{[
													"Automated FICA verification",
													"Risk scoring dashboard",
													"Audit-ready documentation",
												].map((item, i) => (
													<li key={i} className="flex items-center gap-3">
														<div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center">
															<Check className="w-4 h-4 text-warning-foreground" />
														</div>
														<span className="text-foreground">{item}</span>
													</li>
												))}
											</ul>
											<Button
												className="mt-4 border-border text-foreground hover:bg-muted"
												variant="outline">
												Explore Risk Tools <ArrowRight className="ml-2 w-4 h-4" />
											</Button>
										</div>
										<div className="relative aspect-square md:aspect-auto h-full min-h-[300px] bg-muted/50 rounded-xl border border-border p-4">
											{/* Abstract Visualization */}
											<div className="absolute inset-0 bg-linear-to-br from-warning/5 to-transparent" />
											<div className="absolute top-4 left-4 bg-card p-4 rounded-lg border border-border shadow-xl max-w-xs animate-in slide-in-from-left-5 fade-in duration-700">
												<div className="flex items-center gap-3 mb-2">
													<Shield className="w-4 h-4 text-warning-foreground" />
													<span className="text-xs font-medium text-foreground">
														Risk Assessment: Low
													</span>
												</div>
												<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
													<div className="h-full w-full bg-success rounded-full" />
												</div>
											</div>
										</div>
									</div>
								</Card>
							</motion.div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</section>
	);
}
