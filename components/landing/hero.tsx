"use client";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const Hero = () => {
	return (
		<section className="relative overflow-hidden py-24 lg:py-32 bg-rich-black text-white">
			{/* Background Gradient Mesh */}
			<div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
				<div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/40 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
				<div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/30 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow delay-1000" />
			</div>

			<div className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="inline-flex items-center gap-2 px-3 rounded-full bg-indigo-900/10 text-accent text-sm font-medium mb-8 border border-indigo-500/90">
					<Sparkles className="text-indigo-300" size={16} />
					<span className="text-indigo-400 uppercase  tracking-relaxed font-sans-serif font-bold">
						AI-Powered
					</span>
				</motion.div>

				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="text-4xl md:text-6xl lg:text-6xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-bl from-ring via-muted to-zinc-900">
					StratCol Control Tower <br className="hidden md:block" />
					<span className=" sm:text-xl md:text-6xl lg:text-3xl font-black tracking-normal mb-6 bg-clip-text text-transparent bg-linear-to-br from-stone-200	 via-stone-100 to-stone-50 text-2xl">
						Onboarding Intelligence
					</span>
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="text-lg md:text-xl text-stone-400 max-w-2xl mb-10 leading-relaxed">
					A Streamlined HITL workflow with intelligent automations. Enabling your team to
					deliver a 10x world-class onboarding experience.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
					className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
					<Link href="/sign-up" className="w-full sm:w-auto">
						<Button
							size="lg"
							className="w-full sm:w-auto gap-2 text-base bg-ring/70 font-semibold h-12 shadow-lg shadow-primary/20">
							Get Started <ArrowRight size={18} />
						</Button>
					</Link>
					<Link href="/sign-in" className="w-full sm:w-auto">
						<Button
							variant="outline"
							size="lg"
							className="w-full sm:w-auto gap-2 text-base h-12 bg-transparent border-secondary/10 hover:bg-secondary/5 text-white">
							Sign In
						</Button>
					</Link>
				</motion.div>

				{/* Floating Elements / Visuals */}
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.8, delay: 0.5 }}
					className="mt-20 w-full max-w-5xl bg-secondary/5 border border-secondary/10 rounded-2xl p-4 md:p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
					<div className="absolute inset-0 bg-linear-to-t from-rich-black/50 to-transparent z-10 pointer-events-none" />
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80">
						{/* Mock UI Cards */}
						<div className="bg-black/20 p-6 rounded-xl border border-border/50 flex flex-col gap-4">
							<div className="h-2 w-20 bg-white/15 rounded-full" />
							<div className="h-20 w-full bg-secondary/50 rounded-lg animate-pulse" />
							<div className="flex gap-2">
								<div className="h-8 w-8 rounded-full bg-chart-7/20" />
								<div className="space-y-2 flex-1">
									<div className="h-2 w-full bg-chart-6/85 rounded-full" />
									<div className="h-2 w-2/3 bg-chart-6/85 rounded-full" />
								</div>
							</div>
						</div>
						<div className="bg-secondary/20 p-6 rounded-xl border border-border/50 flex flex-col gap-4 md:mt-12">
							<div className="flex justify-between items-center">
								<div className="h-2 w-20 bg-accent rounded-full" />
								<Zap className="text-chart-6" size={16} />
							</div>
							<div className="space-y-3">
								<div className="h-12 w-full bg-ring/65 rounded-lg border-l-4 border-accent" />
								<div className="h-12 w-full bg-chart-6/65 rounded-lg border-l-4 border-transparent" />
								<div className="h-12 w-full bg-ring/65 rounded-lg border-l-4 border-transparent" />
							</div>
						</div>
						<div className="bg-stone-900/70 p-6 rounded-xl border border-border/50 flex flex-col gap-4">
							<div className="h-2 w-20 bg-chart-1/20 rounded-full" />
							<div className="h-32 w-full bg-card/20 rounded-lg flex items-end justify-between px-2 pb-2 gap-2">
								<div className="w-full bg-chart-1/70 h-[40%] rounded-t-sm" />
								<div className="w-full bg-chart-2/70 h-[70%] rounded-t-sm" />
								<div className="w-full bg-chart-3/60 h-[50%] rounded-t-sm" />
								<div className="w-full bg-chart-4/80 h-[85%] rounded-t-sm" />
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
};
