function SignatureBox({ label, type = "text", name, value, onChange }) {
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
