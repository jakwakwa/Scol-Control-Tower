import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import DottedGridHeightSync from "@/components/layout/dotted-grid-height-sync";

import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"], display: "swap" });

import { getBaseUrl } from "@/lib/utils";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
	metadataBase: new URL(baseUrl),
	title: "SCOL WatchTower -Onboarding Ai",
	description: "Database per user starter with Turso, Clerk, and SQLite",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" className={dmSans.variable} suppressHydrationWarning>
				<body
					className={`dotted-grid-container-main  overscroll-none ${inter.className}`}
					suppressHydrationWarning>
					<DottedGridHeightSync />
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
