export default function ContractLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="min-h-screen bg-white rounded-xl m-3 bg-card glass-card w-full max-w-6xl ">
			{children}
		</div>
	);
}
