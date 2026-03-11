import {
	RiDashboardLine,
	RiFileList3Line, // Application icon
	RiShieldCheckLine, // Risk icon
	RiTeamLine, // Clients icon
	RiSettings4Line, // Settings
	RiQuestionLine, // Help
} from "@remixicon/react";

export const START_COL_NAV_ITEMS = [
	{
		section: "MAIN MENU",
		items: [
			{ name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
			{
				name: "Applications",
				href: "/dashboard/applications",
				icon: RiFileList3Line,
			},
			{
				name: "Risk Review",
				href: "/dashboard/risk-review",
				icon: RiShieldCheckLine,
			},
			{ name: "Clients", href: "/dashboard/clients", icon: RiTeamLine },
		],
	},
	{
		section: "SYSTEM",
		items: [
			{ name: "Settings", href: "/dashboard/settings", icon: RiSettings4Line },
			{
				name: "Help & Support",
				href: "/dashboard/support",
				icon: RiQuestionLine,
			},
		],
	},
];
