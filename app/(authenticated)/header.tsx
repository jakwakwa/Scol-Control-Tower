import { UserButton } from "./user-button";

export function Header() {
	return (
		<header className="border-b border-secondary/5">
			<div className="max-w-2xl mx-auto px-6">
				<div className="flex justify-between items-center h-20">
					<div className="flex items-center gap-x-3">
						<div className="flex items-center gap-3 text-aquamarine">
							<img
								src="/control_tower_logo.png"
								alt="StratCol"
								className="h-6"
								aria-hidden="true"
							/>
						</div>
					</div>

					<UserButton />
				</div>
			</div>
		</header>
	);
}
