"use client";

import { motion } from "framer-motion";

export const TrustedBy = () => {
	// Placeholder logos or names
	const companies = ["ABSA", "PASSA", "Nedbank", "SARS", "CTIC"];

	return (
		<section className="py-12 bg-muted/50 border-y border-border/5">
			<div className="container px-4 mx-auto text-center">
				<p className="text-sm font-medium text-white mb-8 uppercase tracking-wider">
					Trusted by industry leaders
				</p>
				<div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
					{companies.map((company, index) => (
						<motion.div
							key={company}
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.1 }}
							className="text-xl md:text-2xl font-black text-foreground">
							{company}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};
