"use client";

import {
	RiAlarmWarningLine,
	RiBarChartBoxAiFill,
	RiDashboardLine,
	RiMenuFoldLine,
	RiMenuUnfoldLine,
	RiRobot2Line,
	RiShieldCheckLine,
	RiUserAddLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const navigation = [
	{ name: "Overview", href: "/dashboard", icon: RiDashboardLine },
	{ name: "Applicants", href: "/dashboard/applicants", icon: RiUserAddLine },
	{ name: "Workflows", href: "/dashboard/workflows", icon: RiBarChartBoxAiFill },
	{
		name: "Risk Review",
		href: "/dashboard/risk-review",
		icon: RiShieldCheckLine,
	},
	{
		name: "Sanctions",
		href: "/dashboard/sanctions",
		icon: RiAlarmWarningLine,
	},
	{ name: "Agents", href: "/dashboard/agents", icon: RiRobot2Line },
];

export function Sidebar({
	isCollapsed,
	setIsCollapsed,
}: {
	isCollapsed: boolean;
	setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const pathname = usePathname();

	return (
		<aside
			data-testid="sidebar"
			className={cn(
				"fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
				"bg-sidebar backdrop-blur-xl border-r border-secondary/5",
				isCollapsed ? "w-20" : "w-64"
			)}>
			{/* Header */}
			<div className="flex h-24 items-center justify-between px-6 border-b border-secondary/5">
				<div className={cn("flex items-center gap-1 ", isCollapsed && "hidden")}>
					<div className="flex flex-col w-full h-fit items-start px-4 py-2 justify-center rounded-2xl  border-stone-500/20">
						<img src="/assets/logo-dark.svg" alt="StratCol" className="h-8 w-auto" />
						<span className="text-secondary text-xs uppercase hidden leading-[14px]">
							Control Tower
						</span>
					</div>
				</div>

				{/* Collapse button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsCollapsed(!isCollapsed)}
					className={cn(
						"flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
						"hover:bg-secondary/5 text-muted-foreground hover:text-foreground",
						isCollapsed && "mx-auto"
					)}
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
					{isCollapsed ? (
						<RiMenuUnfoldLine className="h-5 w-5 text-sidebar-primary" />
					) : (
						<RiMenuFoldLine className="h-5 w-5 text-sidebar-primary" />
					)}
				</Button>
			</div>

			{/* Navigation */}
			<nav className="flex flex-col gap-[2px] p-4">
				{navigation.map(item => {
					const isActive =
						pathname === item.href ||
						(item.href !== "/dashboard" && pathname.startsWith(item.href));

					return (
						<Link
							key={item.name}
							href={item.href}
							className={cn(
								"group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
								isActive
									? "bg-linear-to-r from-primary/10 to-stone-400/5 text-primary"
									: "text-sidebar-foreground hover:bg-secondary/5 hover:text-foreground",
								isCollapsed && "justify-center px-0"
							)}>
							{/* Active indicator */}
							{isActive && (
								<div className="absolute left-[2px] h-10 w-1 rounded-l-2xl bg-linear-to-b from-stone-400 to-stone-500" />
							)}

							<item.icon
								className={cn(
									"h-5 w-5 shrink-0 transition-transform duration-200",
									isActive && "text-sidebar-primary",
									!isActive && "group-hover:scale-110"
								)}
							/>

							{!isCollapsed && (
								<span
									className={cn(
										"text-sidebar-accent focus-visible:text-sidebar-primary font-medium font-sans",
										isActive && "text-sidebar-primary"
									)}>
									{item.name}
								</span>
							)}

							{/* Tooltip for collapsed state */}
							{isCollapsed && (
								<div className="absolute left-full ml-2 hidden rounded-md bg-popover px-2 py-1 text-xs shadow-lg group-hover:block">
									{item.name}
								</div>
							)}
						</Link>
					);
				})}
			</nav>

			{/* Bottom section */}
			<div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
				<div
					className={cn(
						"flex items-center gap-3 rounded-xl bg-linear-to-r from-stone-500/10 to-stone-500/5 p-3",
						isCollapsed && "justify-center p-2"
					)}>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-500/20">
						<RiBarChartBoxAiFill className="h-4 w-4 text-stone-400" />
					</div>
					{!isCollapsed && (
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium text-stone-200">Active Workflows</p>
							<p className="text-lg font-bold text-foreground">12</p>
						</div>
					)}
				</div>
			</div>
		</aside>
	);
}
