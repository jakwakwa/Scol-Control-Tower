"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function Hero() {
	return (
		<section className="relative pt-32 pb-20 md:pt-21 md:pb-32 overflow-hidden ">
			<div className="container px-4 mx-auto relative z-10">
				<div className="max-w-4xl mx-auto text-center mb-16">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}>
						<div className="flex justify-center mb-8">
							<Image
								src="/control_tower_logo.png"
								alt="Control Tower Logo"
								width={200}
								height={64}
								className="h-16 w-auto"
								priority
							/>
						</div>
						<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-white/90">
							Accelerate Trust.
							<br />
							Automate Onboarding.
						</h1>
						<p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
							Here we Transformed our client intake from a paper chase into a digital
							science. Our central contral tower for Sales and Compliance teams.
						</p>
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
					<div className="relative rounded-xl border-none bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden group">
						<div className="absolute inset-0 bg-linear-to-b from-transparent to-background/20 z-20 pointer-events-none" />
					</div>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-2">
						<a href="/dashboard">
							<Button variant="secondary" size="lg">
								Launch Control Tower
								<ArrowRight className="mx-2 h-4 w-4" />
							</Button>
						</a>
						<a
							href="https://stratcolltd.mintlify.app/user-guides/overview"
							target="_blank"
							rel="noopener noreferrer">
							<Button variant="secondary" size="lg" className="bg-cyan-500">
								<FileText className="mr-2 h-4 w-4" />
								View Documentation
							</Button>
						</a>
					</div>
					{/* Glow Effect */}
					<div className="absolute w-1/2 mx-auto -inset-2 animate-pulse bg-primary/20 blur-2xl -z-1 shadow-sm shadow-cyan-400/90 rounded opacity-90"></div>
				</motion.div>
			</div>

			{/* Background Grid */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,var(--background)_70%,transparent_100%)] pointer-events-none opacity-20" />
		</section>
	);
}
