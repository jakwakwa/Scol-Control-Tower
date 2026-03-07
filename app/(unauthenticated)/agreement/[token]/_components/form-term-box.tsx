import type { ReactNode } from "react";

type TermBlockProps = {
	title: string;
	children: ReactNode;
};

function TermBlock({ title, children }: TermBlockProps) {
	return (
		<div className="mb-4">
			<h4 className="font-bold text-gray-800 mb-2">{title}</h4>
			<div className="space-y-2 text-gray-700 pl-4 border-l-2 border-gray-200">
				{children}
			</div>
		</div>
	);
}
export default TermBlock;
