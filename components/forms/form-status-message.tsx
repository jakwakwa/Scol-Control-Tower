import ExternalStatusCard from "@/components/forms/external/external-status-card";

interface FormStatusMessageProps {
	title: string;
	description: string;
}

export default function FormStatusMessage({
	title,
	description,
}: FormStatusMessageProps) {
	return <ExternalStatusCard title={title} description={description} />;
}
