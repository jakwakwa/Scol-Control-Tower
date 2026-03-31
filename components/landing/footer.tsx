import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const Footer = () => {
	return (
		<footer className="relative flex z-99 mx-0 px-0 py-12  w-screen max-w-full min-w-screen bg-black h-full m-auto">
			<div className="flex flex-col  pt-12 gap-12 items-around h-full justify-around  max-w-screen">
				{/* CTA Section */}
				<div className="min-w-full text-center border-t-0 border-l-0 border-r-0 border-b-cyan-300/10 border pb-24 ">
					<h2 className="text-xl w-full md:text-5xl font-bold text-foreground mb-6 leading-[1.3]">
						Request Access to
						<br />
						take command in the Tower
					</h2>

					<Button
						size="lg"
						className="rounded-half h-12 px-4 text-base bg-[var(--gold-500)] hover:bg-gold-600 text-white"
						asChild>
						<Link href="/sign-up">
							{" "}
							<ArrowRight className=" h-4 w-4 mx-0" />
							Request Access
						</Link>
					</Button>
				</div>

				{/* Footer Links */}
				<div className="w-screen items-center  flex flex-row justify-between">
					<div className="max-w-full mx-8">
						<div className="text-xl font-bold text-foreground tracking-tighter">
							SCOL <span className="text-muted-foreground">CONTROL TOWER</span>
						</div>
						<p className="text-sm text-muted-foreground">
							© {new Date().getFullYear()} StratCol. All rights reserved.
						</p>
					</div>

					<div className="flex gap-5 text-sm text-muted-foreground w-100  text-right mx-8">
						<Link href="#" className="hover:text-foreground transition-colors w-full">
							Privacy Policy
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors w-full">
							Terms of Service
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors w-full">
							Contact Support
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
};
