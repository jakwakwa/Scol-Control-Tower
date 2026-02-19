export default function ContractLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <div className="min-h-screen bg-[#f4f1ed]">{children}</div>;
}
