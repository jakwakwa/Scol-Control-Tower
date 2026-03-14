import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";

import "./globals.css";
import { MockScenarioOverlay } from "@/components/mock/mock-scenario-overlay";
import { isMockEnvironmentEnabled } from "@/lib/mock-environment";

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
	const isMockEnvironment = isMockEnvironmentEnabled();

	return (
		<ClerkProvider>
			<html lang="en" className={dmSans.variable} suppressHydrationWarning>
				<body
					data-mock-environment={isMockEnvironment ? "true" : "false"}
					className={`bg-background  overscroll-none  ${inter.className} override-padding-reset`}
					suppressHydrationWarning>
					{process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" && (
						<div className="bg-red-600 text-white text-center py-1 text-sm font-bold z-50">
							UAT SANDBOX — DO NOT ENTER REAL APPLICANT DATA OR PII
						</div>
					)}
					<MockScenarioOverlay
						hasPreviewBanner={process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"}
					/>
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
