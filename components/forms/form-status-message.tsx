interface FormStatusMessageProps {
	title: string;
	description: string;
}

export default function FormStatusMessage({
	title,
	description,
}: FormStatusMessageProps) {
	return (
		<div className="space-y-2 text-center">
			<h2 className="text-xl font-semibold text-foreground">{title}</h2>
			<p className="text-sm text-muted-foreground">{description}</p>
		</div>
	);
}
