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
		<div className="stratcol-sig-wrapper">
			<label className="stratcol-sig-label">{label}</label>
			{type === "date" ? (
				<input
					type="date"
					name={name}
					value={value}
					onChange={onChange}
					className="stratcol-sig-date"
				/>
			) : (
				<div className="stratcol-sig-box">Sign here...</div>
			)}
		</div>
	);
}

export default SignatureBox;
