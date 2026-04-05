"use client";

import { RiCheckboxCircleFill } from "@remixicon/react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Check, Shield } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RoleTabs() {
	return (
		<section className="py-24 bg-primary/10">
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
									className="px-8 py-3 data-[state=active]:shadow-sm data-[state=active]:shadow-[var(--gold-500)]/90 data-[state=active]:text-[var(--gold-500)] rounded-lg transition-all">
									Account Executives
								</TabsTrigger>
								<TabsTrigger
									value="risk"
									className="px-8 py-3 data-[state=active]:shadow-sm data-[state=active]:shadow-[var(--gold-500)]/90 data-[state=active]:text-[var(--gold-500)] rounded-lg transition-all">
									For Risk Managers
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="sales">
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3 }}>
								<Card className=" min-h-[1380px]aspect-square md:aspect-auto  h-full outline-1 outline-border relative overflow-hidden rounded-xl border border-border p-0 col-span-1 w-full  right-0 top-0 flex items-center justify-centerx flex-row items-center w-full">
									<div className="flex flex-row gap-8 p-8 md:p-12 items-center w-full h-full">
										<div className="space-y-6 w-1/2">
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
										<div className=" min-h-[1380px]aspect-square md:aspect-auto  h-full outline-1 outline-border relative overflow-hidden rounded-xl border border-border p-0 col-span-1 w-full  right-0 top-0 flex items-center justify-center">
											{/* Abstract Visualization */}
											<Image
												src="/assets/risk-thumb.png"
												alt="Risk Assessment"
												width={500}
												height={500}
												className="min-h-120 min-w-full top-0 left-0 w-full h-full object-cover"
											/>
											<div className=" inset-0 bg-linear-to-br from-primary/5 to-transparent" />
											<div className="absolute bottom-4 right-4 bg-amber-900/20 p-4 rounded-lg border border-white/20 shadow-xl max-w-xs animate-in slide-in-from-bottom-5 fade-in duration-700 backdrop-blur-xs">
												<div className="flex items-center gap-1 mb-2">
													<div className="w-2 h-2 rounded-full bg-success" />
													<RiCheckboxCircleFill className="w-4 h-4 text-success" />
													<span className="text-xs font-medium text-foreground">
														Mandate Signed
													</span>
												</div>
												<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
													<div className="h-full w-3/4 bg-emerald-400 rounded-full" />
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
								<Card className="bg-black/20 rounded-xl border-border overflow-hidden shadow-lg flex flex-row items-center w-full relative h-full ">
									<div className="space-y-6 col-span-1 ">
										<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10  h-full text-warning-foreground text-sm font-medium border border-warning/20">
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
									<div className=" min-h-[1380px]aspect-square md:aspect-auto  h-full outline-1 outline-border relative overflow-hidden rounded-xl border border-border p-0 col-span-1 w-full  right-0 top-0 flex items-center justify-center">
										{/* Abstract Visualization */}
										<Image
											src="/assets/risk-thumb.png"
											alt="Risk Assessment"
											width={500}
											height={500}
											className="min-h-120 min-w-full top-0 left-0 w-full h-full object-cover"
										/>
										<div className="absolute inset-0 bg-linear-to-br from-amber-900/10 to-transparent" />
										<div className="absolute  bg-black/50 top-4 left-4 p-4 rounded-lg border border-white/20 shadow-xl max-w-xs animate-in slide-in-from-left-5 fade-in duration-700 backdrop-blur-xs">
											<div className="flex items-center gap-3 mb-2 ">
												<Shield className="w-4 h-4 text-warning-foreground" />
												<span className="text-xs font-medium text-foreground">
													Risk Assessment: Low
												</span>
											</div>
											<div className="h-1.5 w-full bg-amber-900/20 rounded-full overflow-hidden">
												<div className="h-full w-full bg-amber-400 rounded-full" />
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
