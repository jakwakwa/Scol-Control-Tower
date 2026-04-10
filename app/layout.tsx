import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import "./globals.css";

import { getBaseUrl } from "@/lib/utils";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
	metadataBase: new URL(baseUrl),
	title: "SCOL WatchTower -Onboarding Ai",
	description: "Database per user starter with Turso, Clerk, and SQLite",
	icons: {
		icon: "/favicon.png",
		apple: "/favicon.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body className="bg-background overscroll-none override-padding-reset" suppressHydrationWarning>
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
