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
			<label htmlFor={name} className="stratcol-sig-label">
				{label}
			</label>
			{type === "date" ? (
				<input
					id={name}
					type="date"
					name={name}
					value={value}
					onChange={onChange}
					className="stratcol-sig-date"
				/>
			) : (
				<div id={name} className="stratcol-sig-box" role="textbox" aria-label={label}>
					Sign here...
				</div>
			)}
		</div>
	);
}

export default SignatureBox;
