"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function Hero() {
	return (
		<section className="relative pt-32 pb-20 md:pt-21 md:pb-32 overflow-hidden bg-background">
			<div className="container px-4 mx-auto relative z-10">
				<div className="max-w-4xl mx-auto text-center mb-16">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}>
						<div className="flex justify-center mb-8">
							<Image
								src="/assets/logo-dark.svg"
								alt="Control Tower Logo"
								width={200}
								height={64}
								className="h-16 w-auto"
								priority
							/>
						</div>
						<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-foreground">
							Accelerate Trust.
							<br />
							Automate Onboarding.
						</h1>
						<p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
							Transform your client intake from a paper chase into a digital science. The
							central command for Sales and Compliance teams.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<a href="/dashboard">
								<Button
									size="lg"
									className="rounded-full h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90">
									Launch Control Tower
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</a>
							<a
								href="https://stratcolltd.mintlify.app/user-guides/overview"
								target="_blank"
								rel="noopener noreferrer">
								<Button
									variant="outline"
									size="lg"
									className="rounded-full h-12 px-8 text-base border-border text-foreground hover:bg-muted">
									<FileText className="mr-2 h-4 w-4" />
									View Documentation
								</Button>
							</a>
						</div>
					</motion.div>
				</div>

				{/* Dashboard Mockup with Tilt Animation */}
				<motion.div
					initial={{ rotateX: -15, opacity: 0, y: 50 }}
					animate={{ rotateX: 0, opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 100,
						damping: 20,
						delay: 0.2,
					}}
					style={{
						perspective: 1000,
					}}
					className="relative max-w-6xl mx-auto">
					<div className="relative rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden group">
						<div className="absolute inset-0 bg-linear-to-b from-transparent to-background/20 z-20 pointer-events-none" />

						{/* Dashboard Image */}
						<Image
							src="/assets/dashboard-mockup.png"
							alt="StratCol Control Tower Dashboard Interface"
							width={1200}
							height={800}
							className="w-full h-auto object-cover shadow-inner"
						/>
					</div>

					{/* Glow Effect */}
					<div className="absolute -inset-4 bg-primary/10 blur-3xl -z-10 rounded-[3rem] opacity-40" />
				</motion.div>
			</div>

			{/* Background Grid */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,var(--background)_70%,transparent_100%)] pointer-events-none opacity-20" />
		</section>
	);
}
