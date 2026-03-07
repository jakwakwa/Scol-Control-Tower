"use client";

import { motion } from "framer-motion";
import { FileSignature, Flag, ShieldCheck, User, Zap } from "lucide-react";

export function WorkflowSteps() {
	const steps = [
		{
			id: 1,
			title: "Applicant",
			description: "Entry Point",
			icon: User,
			color: "text-primary",
			bgColor: "bg-primary/10",
			borderColor: "border-primary/20",
		},
		{
			id: 2,
			title: "Contracting",
			description: "Digital Signatures",
			icon: FileSignature,
			color: "text-primary",
			bgColor: "bg-primary/10",
			borderColor: "border-primary/20",
		},
		{
			id: 3,
			title: "FICA Review",
			description: "AI + Human Loop",
			icon: ShieldCheck,
			color: "text-amber-600 dark:text-amber-400",
			bgColor: "bg-amber-100 dark:bg-amber-900/20",
			borderColor: "border-amber-200 dark:border-amber-800",
		},
		{
			id: 4,
			title: "Activation",
			description: "System Integration",
			icon: Zap,
			color: "text-accent-foreground",
			bgColor: "bg-accent/10",
			borderColor: "border-accent/20",
		},
		{
			id: 5,
			title: "Completed",
			description: "Revenue Ready",
			icon: Flag,
			color: "text-success",
			bgColor: "bg-success/10",
			borderColor: "border-success/20",
		},
	];

	return (
		<section className="py-24 bg-background relative overflow-hidden">
			{/* Background Elements */}
			<div className="absolute top-1/2 left-0 w-full h-px bg-linear-to-r from-transparent via-border to-transparent -translate-y-1/2 hidden md:block" />

			<div className="container px-4 mx-auto relative z-10">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
						Frictionless Velocity
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Move clients from 'interested' to 'revenue-generating' in record time without
						manual hand-offs.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-5 gap-8">
					{steps.map((step, index) => (
						<motion.div
							key={step.id}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-50px" }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="relative group">
							<div className="flex flex-col items-center text-center">
								<div
									className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${step.borderColor} ${step.bgColor} backdrop-blur-sm relative z-10 transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
									<step.icon className={`w-8 h-8 ${step.color}`} />
									{/* Connection Line Mobile */}
									{index < steps.length - 1 && (
										<div className="absolute top-full left-1/2 w-0.5 h-8 bg-border -translate-x-1/2 md:hidden" />
									)}
								</div>
								<h3 className="text-lg font-semibold text-foreground mb-1">
									{step.title}
								</h3>
								<p className="text-sm text-muted-foreground">{step.description}</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
