import type { ChangeEventHandler } from "react";

interface SignatureBoxProps {
	label: string;
	type?: "text" | "date";
	name: string;
	value: string;
	onChange: ChangeEventHandler<HTMLInputElement>;
}

function SignatureBox({ label, type = "text", name, value, onChange }: SignatureBoxProps) {
	return (
		<div className="flex flex-col">
			{type === "date" ? (
				<label className="text-sm font-bold text-gray-500 mb-2">
					{label}

					<input
						type="date"
						name={name}
						value={value}
						onChange={onChange}
						className="border-b-2 border-gray-400 bg-transparent outline-none p-1 uppercase"
					/>
				</label>
			) : (
				<div className="border-b-2 border-red-400 h-10 bg-red-200/90 flex items-end pb-1 px-2 italic text-red-400 text-sm">
					enter a date first
				</div>
			)}
		</div>
	);
}

export default SignatureBox;
