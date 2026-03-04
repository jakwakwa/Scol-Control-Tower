function TermBlock({ title, children }) {
	return (
		<div className="stratcol-term-wrapper">
			<h4 className="stratcol-term-title">{title}</h4>
			<div className="stratcol-term-content">{children}</div>
		</div>
	);
}
export default TermBlock;
