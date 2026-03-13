"use client";

import Grainient from "@/components/Grainient";

export default function Layout({

	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// The dashboard layout is now handled by individual pages using DashboardLayout component
	return <>
	
	
	{children}
	
	</>;
}
